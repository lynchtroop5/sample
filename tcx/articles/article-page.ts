import {Component, AfterViewInit, OnInit} from '@angular/core';
import {Location} from '@angular/common';
import {Router, ActivatedRoute} from '@angular/router';
import {isBrowser} from 'angular2-universal';

//globals
import {GlobalFunctions} from "../../global/global-functions";
import {GlobalSettings} from "../../global/global-settings";
import {VerticalGlobalFunctions} from "../../global/vertical-global-functions";

//services
import {ArticleDataService} from "../../services/article-page-service";
import {DeepDiveService} from '../../services/deep-dive.service';
import {GeoLocation} from "../../global/global-service";
import {SeoService} from '../../seo.service';

//interfaces
import {Article} from "../../global/global-interface";
import {ArticleData} from "../../global/global-interface";

//libraries
declare var jQuery:any;
declare var moment;

@Component({
  selector: 'article-pages',
  templateUrl: './article-pages.page.html'
})

export class ArticlePages implements OnInit {
  public params;
  public trendingContent:Array<any>;
  public trendingData:any;
  public isAiArticle:boolean = false;
  article:Article;
  articleData:any;
  subRec:any;
  trendingArticles:any;
  copyright:Array<any>;
  imageData:Array<any>;
  imageTitle:Array<any>;
  randomArticles:Array<any>;
  randomHeadlines:Array<any>;
  aiSidekick:boolean = true;
  checkPartner:boolean;
  error:boolean = false;
  hasRun:boolean = false;
  isFantasyReport:boolean = false;
  isTrendingMax:boolean = false;
  showLoading:boolean = true;
  eventType:string;
  eventID:string;
  date:string;
  partnerId:string;
  title:string;
  type:string;
  scope:string = null;
  partnerID:string;
  geoLocation:string;
  iframeUrl:any;
  batch:number = 1;
  isBrowser:any;

  constructor(private _activateRoute:ActivatedRoute,
              private _router:Router,
              private _articleDataService:ArticleDataService,
              private _location:Location,
              private _seoService:SeoService,
              private _deepDiveService:DeepDiveService,
              private _geoLocation:GeoLocation) {
    this.subRec = this._activateRoute.params.subscribe(
      (params:any) => {
        this.routeChangeResets();
        this.scope = params.scope == "nfl" ? "nfl" : "ncaa";
        if (params.partnerID != null) {
          this.partnerId = params.partnerID;
        }
        this.eventID = params['eventID'];
        this.eventType = params['eventType'];

        if (this.eventType == "story" || this.eventType == "video") {
          this.isAiArticle = false;
          this.eventType == "story" ? this.getDeepDiveArticle(this.eventID) : this.getDeepDiveVideo(this.eventID);
          this.getGeoLocation();
        }
        if (this.eventType != 'story' && this.eventType != 'video') {
          this.isAiArticle = true;
          this.scope = params.scope;
          this.type = this.eventType;
          this.eventType = this._articleDataService.getApiArticleType(this.eventType);
          if (this.eventType == "articleType=player-fantasy") {
            this.isFantasyReport = true;
          }
          this.getAiArticles();
        }
        this.checkPartner = GlobalSettings.getHomeInfo().isPartner;
      }
    );
  }

  routeChangeResets() {
    this.articleData = null;
    this.trendingData = null;
    this.isTrendingMax = false;
    this.isFantasyReport = false;
    this.trendingContent = [];
  } //routeChangeResets

  getAiArticles() {
    this._articleDataService.getArticle(this.eventID, this.eventType, this.partnerId, this.scope, this.isFantasyReport, this.type)
      .finally(() => GlobalSettings.setPreboot()) // call preboot after last piece of data is returned on page
      .subscribe(Article => {
          try {
            this.articleData = Article;
            this.date = Article.date;
            if (this.articleData.hasEventId) {
              this.getRecommendedArticles(this.articleData.eventID);
            }
            this.isTrendingMax = false;
            this.getTrendingArticles(this.eventID);
            this.metaTags(Article);
          } catch (e) {
            console.log('Error getAiArticles Function', e);
            this.error = true;
            var self = this;
            setTimeout(function () {
              //removes error page from browser history
              self._location.replaceState('/');
              //returns user to previous page
              self._router.navigateByUrl('/home');
            }, 5000);
          }
        },
        err => {
          this.error = true;
          var self = this;
          setTimeout(function () {
            //removes error page from browser history
            self._location.replaceState('/');
            //returns user to previous page
            self._router.navigateByUrl('/home');
          }, 5000);
        }
      )
  }

  getRecommendedArticles(eventId) {
    if (this.eventType != "story" && this.eventType != "video") {
      this.randomArticles = this._articleDataService.getRandomArticles(this.randomArticles, this.scope, this.eventType);
      this._articleDataService.getRecommendationsData(eventId, this.scope)
        .subscribe(data => {
          this.randomHeadlines = data;
        });
    } else {
      var startNum = Math.floor((Math.random() * 8) + 1);
      //needed to uppercase for ai to grab data correctly
      this._deepDiveService.getRecArticleData(this.scope, this.geoLocation, startNum, 3)
        .subscribe(data => {
          try{
            this.randomHeadlines = this._deepDiveService.transformToRecArticles(data.data);
          }catch(e){
            console.log("error in recommended articles");
          }
        });
    }
  }

  private getTrendingArticles(currentArticleId) {
    var getData = this.isAiArticle ? this._articleDataService.getAiTrendingData(this.batch, this.scope) : this._deepDiveService.getDeepDiveBatchService(this.scope, 10, this.batch, this.geoLocation);
    this.trendingArticles = getData.subscribe(data => {
        if (!this.hasRun) {
          this.trendingContent = this.isAiArticle ? this.trendingContent.concat(data['data']) : this.trendingContent.concat(data['articles']);
          this.hasRun = true;
          this.trendingData = this.isAiArticle ? this._articleDataService.transformTrending(this.trendingContent, currentArticleId, this.scope, true) :
            this._articleDataService.transformTrending(this.trendingContent, currentArticleId, this.scope, false);
          if ((data.article_count % 10 == 0 || data['articles'].length % 10 == 0) && this.trendingData) {
            this.batch = this.batch + 1;
          } else {
            this.isTrendingMax = true;
            this.showLoading = false;
          }
        }
      });
  }

  private trendingScroll(event) {
    if (!this.isTrendingMax) {
      if (jQuery(document).height() - window.innerHeight - jQuery("footer").height() <= jQuery(window).scrollTop()) {
        this.hasRun = false;
        this.showLoading = true;
        this.getTrendingArticles(this.eventID);
      }
    }
  }

  ngOnInit() {
    if (isBrowser) {
      //This has to be resize to trigger the takeover update
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (e) {
        //to run resize event on IE
        var resizeEvent = document.createEvent('UIEvents');
        resizeEvent.initUIEvent('resize', true, false, window, 0);
        window.dispatchEvent(resizeEvent);
      }
    }
  }

  ngAfterViewInit() {
    if (isBrowser) {
      // to run the resize event on load
      try {
        window.dispatchEvent(new Event('load'));
      } catch (e) {
        //to run resize event on IE
        var resizeEvent = document.createEvent('UIEvents');
        resizeEvent.initUIEvent('load', true, false, window, 0);
        window.dispatchEvent(resizeEvent);
      }
    }
  }

  private getDeepDiveArticle(articleID) {
    this._deepDiveService.getDeepDiveArticleService(articleID)
      .finally(() => GlobalSettings.setPreboot()) // call preboot after last piece of data is returned on page
      .subscribe(data => {
          if (data.data.imagePath == null || data.data.imagePath == undefined || data.data.imagePath == "") {
            this.imageData = ["/app/public/stockphoto_bb_1.jpg", "/app/public/stockphoto_bb_2.jpg"];
            this.copyright = ["USA Today Sports Images", "USA Today Sports Images"];
            this.imageTitle = ["", ""];
          } else {
            this.imageData = [GlobalSettings.getImageUrl(data.data.imagePath, GlobalSettings._carouselImg)];
            this.copyright = ["USA Today Sports Images"];
            this.imageTitle = [""];
          }
          this.metaTags(data);
          this.articleData = data.data;
          let rawUrl = isBrowser ? window.location.protocol + "//" + window.location.host : GlobalSettings._proto + "//" + GlobalSettings._globalSiteUrl;
          this.articleData.rawUrl = rawUrl + "/" + this.scope + "/articles/story/" + this.articleData.id;
          this.date = GlobalFunctions.sntGlobalDateFormatting(moment.unix(this.articleData.publishedDate / 1000), "timeZone");
          this.getRecommendedArticles(articleID);
          this.getTrendingArticles(this.eventID);
        },
        err => {
          this.error = true;
          var self = this;
          setTimeout(function () {
            //removes error page from browser history
            self._location.replaceState('/');
            //returns user to previous page
            self._router.navigateByUrl('/home');
          }, 5000);
        }
      )
  }

  private getDeepDiveVideo(articleID) {
    this._deepDiveService.getDeepDiveVideoService(articleID)
      .finally(() => GlobalSettings.setPreboot()) // call preboot after last piece of data is returned on page
      .subscribe(data => {
          this.articleData = data.data;
          let rawUrl = isBrowser ? window.location.protocol + "//" + window.location.host : GlobalSettings._proto + "//" + GlobalSettings._globalSiteUrl;
          this.articleData.rawUrl = rawUrl + "/" + this.scope + "/articles/video/" + this.articleData.id;
          this.date = GlobalFunctions.sntGlobalDateFormatting(this.articleData.pubDate, "timeZone");
          this.metaTags(data);
          this.iframeUrl = this.articleData.videoLink;
          this.getRecommendedArticles(articleID);
        },
        err => {
          this.error = true;
          var self = this;
          setTimeout(function () {
            //removes error page from browser history
            self._location.replaceState('/');
            //returns user to previous page
            self._router.navigateByUrl('/home');
          }, 5000);
        }
      )
  }

  private metaTags(data) {
    //This call will remove all meta tags from the head.
    this._seoService.removeMetaTags();
    //create meta description that is below 160 characters otherwise will be truncated
    var metaData = this.isAiArticle ? data : data.data;
    let image, metaDesc;
    var teams = [];
    var players = [];
    var searchString = "football";
    var searchArray = [];
    var isArticle;
    let link = this._seoService.getPageUrl();
    isArticle = this.eventType == "video" ? false : true;
    if (this.isAiArticle) {
      var headerData = metaData['articleContent']['metadata'];
      metaDesc = metaData.teaser;
      if (headerData['team_name'] && headerData['team_name'].constructor === Array) {
        headerData['team_name'].forEach(function (val) {
          searchArray.push(val);
          teams.push(val);
        });
      }
      if (headerData['player_name'] && headerData['player_name'].constructor === Array) {
        headerData['player_name'].forEach(function (val) {
          searchArray.push(val);
          players.push(val);
        });
      }
      if (metaData['articleContent']['keyword'] && metaData['articleContent']['keyword'].constructor === Array) {
        metaData['articleContent']['keyword'].forEach(function (val) {
          searchArray.push(val);
        });
        searchString += ', ' + searchArray.join(',');
      } else {
        searchArray.push(metaData['articleContent']['keyword']);
        searchString += ', ' + searchArray.join(',');
      }
      image = metaData['images']['imageData'][0];
    } else {
      metaDesc = metaData.teaser;
      image = GlobalSettings.getImageUrl(metaData.imagePath, GlobalSettings._imgLgLogo);
    }

    let metaObjData;
    if (this.isAiArticle) {// done as if statement since SSR has issues with single line expressions on meta tags
      var updated = metaData['articleContent'].last_updated ? metaData['articleContent'].last_updated.toString() : metaData['articleContent'].publication_date.toString();
      metaObjData = {
        startDate: headerData['relevancy_start_date'].toString(),
        endDate: headerData['relevancy_end_date'].toString(),
        source: "snt_ai",
        keyword: metaData['articleContent']['keyword'],
        publishedDate: updated,
        author: metaData['articleContent'].author,
        publisher: metaData['articleContent'].publisher,
        articleTeaser: metaData.teaser.replace(/<ng2-route>|<\/ng2-route>/g, ''),
        setArticleType: metaData.articleType,
      }
    } else {
      metaObjData = {
        startDate: metaData.pubDate,
        endDate: metaData.pubDate,
        source: isArticle ? "TCA" : "sendtonews.com",
        keyword: metaData.keyword,
        publishedDate: isArticle ? metaData.publishedDate.toString() : metaData.pubDate.toString(),
        author: isArticle ? metaData.author : null,
        publisher: metaData.publisher,
        articleTeaser: metaData.teaser,
        setArticleType: this.scope,
      }
    }
    var title = this._seoService.HtmlEncode(metaData.title);

    this._seoService.setCanonicalLink();
    this._seoService.setTitle(title);
    this._seoService.setMetaDescription(metaDesc);
    this._seoService.setMetaTags([
      {
        'og:title': title,
      },
      {
        'og:description': metaDesc,
      },
      {
        'og:type':'website',
      },
      {
        'og:url':link,
      },
      {
        'og:image': image,
      },
      {
        'es_page_title': title ? title : '',
      },
      {
        'es_page_url': link
      },
      {
        'es_description': metaObjData.articleTeaser ? metaObjData.articleTeaser : metaDesc,
      },
      {
        'es_page_type': isArticle ? "article page" : "video page",
      },
      {
        'es_data_source':metaObjData.source
      },
      {
        'es_article_id':this.eventID
      },
      {
        'es_category':metaObjData.keyword ? metaObjData.keyword : ''
      },
      {
        'es_published_date':metaObjData.publishedDate
      },
      {
        'es_article_author':metaObjData.author
      },
      {
        'es_article_publisher':metaObjData.publisher
      },
      {
        'es_keywords': searchString
      },
      {
        'es_image_url':image
      },
      {
        'start_date':metaObjData.startDate
      },
      {
        'end_date':metaObjData.endDate
      },
      {
        'is_article':isArticle ? 'true' : 'false'
      }
    ])
  } //metaTags

  getGeoLocation() {
    var defaultState = 'ca';
    this._geoLocation.grabLocation()
      .subscribe(
        res => {
          this.geoLocation = res.state.toLowerCase();
          this.geoLocation = this.geoLocation.toLowerCase();
        },
        err => {
          this.geoLocation = defaultState;
        });
  } //getGeoLocation

  ngOnDestroy() {
    if (!this.error) {
      this.subRec.unsubscribe();
      if ( this.trendingArticles ) {
        this.trendingArticles.unsubscribe();
      }
    }
  }
}
