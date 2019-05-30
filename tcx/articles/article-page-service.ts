import { Injectable } from '@angular/core';
import { GlobalSettings } from "../global/global-settings";
import { VerticalGlobalFunctions } from "../global/vertical-global-functions";
import { GlobalFunctions } from "../global/global-functions";
import { ModelService } from "../global/shared/model/model.service";
import { Gradient } from "../global/global-gradient";
import { isBrowser } from 'angular2-universal';
import { Observable } from "rxjs/Observable";

declare var moment;

@Injectable()
export class ArticleDataService {
  pageIndex:string;
  public collegeDivisionAbbrv:string = GlobalSettings.getCollegeDivisionAbbrv();
  public collegeDivisionFullAbbrv:string = GlobalSettings.getCollegeDivisionFullAbbrv();
  constructor(public model:ModelService) {
  }

  //AI article data processing
  getArticleTotal(scope) {
    var fullUrl = GlobalSettings.getArticleUrl();
      return this.model.get(fullUrl + "articles?scope="+scope+"&source[]=snt_ai&count=99999999&page=1&metaDataOnly=1")
        .map(data => {
          return data;
        });
  }

  // //AI article data processing
  // getAllAiArticle(scope, count, page) {
  //   var fullUrl = GlobalSettings.getArticleUrl();
  //     return this.model.get(fullUrl + "articles?scope="+scope+"&source[]=snt_ai&count=" + count + "&page=" + page + "&metaDataOnly=1")
  //       .map(data => {
  //         return data;
  //       });
  // }

  //AI article data processing
  getArticle(eventID, eventType, partnerId, scope, isFantasyReport, rawType) {
    var fullUrl = GlobalSettings.getArticleUrl();
    var urlScope = scope == 'ncaaf' ? 'fbs' : scope;
    if (!isFantasyReport) {
      return this.model.get(fullUrl + "articles?" + eventType + '&event=' + eventID + "&partner=" + partnerId + "&scope=" + urlScope + "&readyToPublish=true")
        .map(data => {
          return ArticleDataService.formatArticleData(data, scope, rawType, isFantasyReport, eventID)
        });
    } else {
      return this.model.get(fullUrl + "articles?" + eventType + '&articleID=' + eventID + "&partner=" + partnerId + "&scope=" + urlScope + "&readyToPublish=true")
        .map(data => {
          return ArticleDataService.formatArticleData(data, scope, rawType, isFantasyReport, eventID)
        });
    }
  }

  static formatArticleData(data, scope, eventType, isFantasyReport, eventId) {
    try{
      var articles = data['data'];
      if (articles.length > 0) {
        var hasEventID = true;
        var hasImages = true;
        var carouselImages;
        if (isFantasyReport) {
          eventId = articles[0].event_id;
          hasEventID = eventId != null;
        }
        let articleType = ArticleDataService.getArticleType(eventType);
        ArticleDataService.parseLinks(articles[0]['article_data']['route_config'], data['data'][0]['article_data']['article'], scope);
        if (articles[0]['article_data']['images'] != null) {
          carouselImages = ArticleDataService.getCarouselImages(articles[0]['article_data']['images'], articleType, isFantasyReport);
          hasImages = false;
        }
      var updated = data['data'][0]['article_data'].last_updated ? data['data'][0]['article_data'].last_updated : data['data'][0]['article_data'].publication_date;
        return {
          eventID: eventId,
          hasEventId: hasEventID,
          articleType: articleType[1],
          articleSubType: articleType[2],
          isSmall: isBrowser ? window.innerWidth < 640 : false,
          rawUrl: isBrowser ? window.location.href : GlobalSettings._proto + "//" + GlobalSettings._globalSiteUrl + Zone.current.get('requestUrl'),
          pageIndex: articleType[0],
          title: articles[0]['article_data'].title,
          teaser: articles[0].teaser,
          date: GlobalFunctions.sntGlobalDateFormatting(updated * 1000, "timeZone"),
          articleContent: articles[0]['article_data'],
          teamId: (isFantasyReport || articles[0].team_id != null) ?
          articles[0].team_id : articles[0]['article_data']['metadata'].team_id,
          images: carouselImages,
          imageLinks: ArticleDataService.getImageLinks(articles[0]['article_data'], articleType[1], scope),
          hasImages: hasImages
        }
      }
    }catch(e){
      console.log('Article Transform Error', e);
    }
  }

  static getCarouselImages(data, articleType, isFantasyReport) {
    var images = [];
    var imageArray = [];
    var copyArray = [];
    var titleArray = [];
    if (articleType == "game-module" || articleType == "team-record") {
      images = data['home_images'].concat(data['away_images']);
    } else if (articleType == "playerRoster") {
      images = data['home_images'];
    } else if (isFantasyReport) {
      images = data['images'];
    } else {
      images = data['away_images'];
    }
    data.sort(function () {
      return 0.5 - Math.random()
    });
    data.forEach(function (val, index) {
      if (!~val.image_url.indexOf('stock_images')) {
        imageArray.push(VerticalGlobalFunctions.getBackgroundImageUrlWithStockFallback(val['image_url'], GlobalSettings._carouselImg));
        copyArray.push(val['image_copyright']);
        titleArray.push(val['image_title']);
      } else if (~val.image_url.indexOf('stock_images') && index == 0) {
        imageArray.push(VerticalGlobalFunctions.getBackgroundImageUrlWithStockFallback(val['image_url'], GlobalSettings._carouselImg));
        copyArray.push(val['image_copyright']);
        titleArray.push(val['image_title']);
      }
    });
    return {
      imageData: imageArray ? imageArray : null,
      copyright: imageArray ? copyArray : null,
      imageTitle: imageArray ? titleArray : null,
      hasImages: true
    }
  }

  static getImageLinks(data, articleType, scope) {
    switch (articleType) {
      case "playerRoster":
        return ArticleDataService.processLinks(data['article'], 'player_roster_module', 'roster', scope);
      case "playerComparison":
        return ArticleDataService.processLinks(data['article'][2]['player_comparison_module'], 'player_comparison_module', 'compare', scope);
      case "teamRecord":
        return ArticleDataService.processLinks(data['article'], 'team_record_module', 'teamRecord', scope);
      case "game_module":
        return ArticleDataService.processLinks(data['article'], 'game_module', 'game_module', scope);
    }
  }

  static getProfileImages(routeArray, url, size) {
    return {
      imageClass: size,
      mainImage: {
        imageUrl: url,
        urlRouteArray: routeArray,
        hoverText: "<i class='fa fa-mail-forward'></i>",
        imageClass: url.indexOf("logos_football") !== -1 ? "fallback-logo" : "border-logo",
        fallbackImageClass: url.indexOf("logos_football") !== -1 ? "fallback-class" : ""
      }
    };
  }

  static processLinks(imageData, dataType, type, scope) {
    var isFirstTeam = true;
    var imageLinkArray = [];
    imageData.forEach(function (val, index) {
      if (type == 'roster') {
        if (val[dataType]) {
          var routeArray = VerticalGlobalFunctions.formatPlayerRoute(scope, val[dataType].team_name, val[dataType].name, val[dataType].id);
          var url = GlobalSettings.getImageUrl(val[dataType]['headshot'], GlobalSettings._imgProfileLogo);
          val['image1'] = ArticleDataService.getProfileImages(routeArray, url, "image-121");
          val['image2'] = ArticleDataService.getProfileImages(routeArray, url, "image-71");
          imageLinkArray.push(val['image1'], val['image2']);
        }
      }
      if (type == 'compare' || type == 'teamRecord' || type == 'game_module') {
        let topCondition = (type == 'compare') ? index == 0 : (type == 'teamRecord') ? val[dataType] && isFirstTeam : index == 1 && val[dataType];
        let bottomCondition = (type == 'compare') ? index == 1 : (type == 'teamRecord') ? val[dataType] && !isFirstTeam : index == 4 && val[dataType];
        if (topCondition) {
          if (type == 'compare' || type == 'teamRecord') {
            if (type == 'compare') {
              var routeArray = VerticalGlobalFunctions.formatPlayerRoute(scope, val.team_name, val.name, val.id);
              var url = GlobalSettings.getImageUrl(val['headshot'], GlobalSettings._imgProfileLogo);
            } else if (type == 'teamRecord') {
              var routeArray = VerticalGlobalFunctions.formatTeamRoute(scope, val[dataType].name, val[dataType].id);
              var url = GlobalSettings.getImageUrl(val[dataType].logo, GlobalSettings._imgProfileLogo);
            }
            val['image1'] = ArticleDataService.getProfileImages(routeArray, url, "image-121");
            val['image2'] = ArticleDataService.getProfileImages(routeArray, url, "image-71");
            imageLinkArray.push(val['image1'], val['image2']);
            isFirstTeam = false;
          } else {
            var shortDate = val[dataType].event_date.substr(val[dataType].event_date.indexOf(",") + 1);
            var urlTeamLeftTop = VerticalGlobalFunctions.formatTeamRoute(scope, val[dataType].home_team_name, val[dataType].home_team_id);
            var urlTeamRightTop = VerticalGlobalFunctions.formatTeamRoute(scope, val[dataType].away_team_name, val[dataType].away_team_id);
            var homeUrl = GlobalSettings.getImageUrl(val[dataType].home_team_logo, GlobalSettings._imgProfileLogo);
            var awayUrl = GlobalSettings.getImageUrl(val[dataType].away_team_logo, GlobalSettings._imgProfileLogo);
            val['image1'] = ArticleDataService.getProfileImages(urlTeamLeftTop, homeUrl, "image-121");
            val['image2'] = ArticleDataService.getProfileImages(urlTeamRightTop, awayUrl, "image-121");
            val['image3'] = ArticleDataService.getProfileImages(urlTeamLeftTop, homeUrl, "image-71");
            val['image4'] = ArticleDataService.getProfileImages(urlTeamRightTop, awayUrl, "image-71");
            imageLinkArray.push(val['image1'], val['image2'], val['image3'], val['image4'], shortDate);
          }
        }
        if (bottomCondition) {
          if (type == 'compare' || type == 'teamRecord') {
            if (type == 'compare') {
              var routeArray = VerticalGlobalFunctions.formatPlayerRoute(scope, val.team_name, val.name, val.id);
              var url = GlobalSettings.getImageUrl(val['headshot'], GlobalSettings._imgProfileLogo);
            } else {
              var routeArray = VerticalGlobalFunctions.formatTeamRoute(scope, val[dataType].name, val[dataType].id);
              var url = GlobalSettings.getImageUrl(val[dataType].logo, GlobalSettings._imgProfileLogo);
            }
            val['image3'] = ArticleDataService.getProfileImages(routeArray, url, "image-121");
            val['image4'] = ArticleDataService.getProfileImages(routeArray, url, "image-71");
            imageLinkArray.push(val['image3'], val['image4']);
          } else {
            var shortDate = val[dataType].event_date.substr(val[dataType].event_date.indexOf(",") + 1);
            var urlTeamLeftBottom = VerticalGlobalFunctions.formatTeamRoute(scope, val[dataType].home_team_name, val[dataType].home_team_id);
            var urlTeamRightBottom = VerticalGlobalFunctions.formatTeamRoute(scope, val[dataType].away_team_name, val[dataType].away_team_id);
            var homeUrl = GlobalSettings.getImageUrl(val[dataType].home_team_logo, GlobalSettings._imgProfileLogo);
            var awayUrl = GlobalSettings.getImageUrl(val[dataType].away_team_logo, GlobalSettings._imgProfileLogo);
            val['image1'] = ArticleDataService.getProfileImages(urlTeamLeftBottom, homeUrl, "image-121");
            val['image2'] = ArticleDataService.getProfileImages(urlTeamRightBottom, awayUrl, "image-121");
            val['image3'] = ArticleDataService.getProfileImages(urlTeamLeftBottom, homeUrl, "image-71");
            val['image4'] = ArticleDataService.getProfileImages(urlTeamRightBottom, awayUrl, "image-71");
            imageLinkArray.push(val['image1'], val['image2'], val['image3'], val['image4'], shortDate);
          }
        }
      }
    });
    return imageLinkArray
  }

  static complexArraySetup(arrayData, type):any {
    if (type == 'empty') {
      return [{text: "empty"}]
    } else if (type == 'basic') {
      return [{text: arrayData}, {text: "<br><br>", class: "line-break"}]
    } else if (type == 'route') {
      return [arrayData.length == 3 ? {text: arrayData[2],} : '', {text: arrayData[0], route: arrayData[1]}]
    }
  }

  static parseLinks(routeData, articleData, scope) {
    var placeHolder = null;
    var routes;
    var fullRoutes = [];
    var newParagraph = [];
    var paragraph;
    var complexArray = [];
    var routeList = [];
    if (routeData) {
      routeData.forEach(function (val) {
        routes = {
          index: val.paragraph_index,
          name: val.display,
          route: val.route_type == "tdl_team" ? VerticalGlobalFunctions.formatTeamRoute(scope, val.display, val.id) : VerticalGlobalFunctions.formatPlayerRoute(scope, val.team_name, val.display, val.id),
          searchParameter: "<ng2-route>" + val.display + "<\s*/?ng2-route>",
        };
        fullRoutes.push(routes);
      });
      routeList = fullRoutes;
    } else {
      routeList = [];
    }
    articleData.forEach(function (val, index) {
      if (typeof val != "object") {
        if (val == "") {
          complexArray = ArticleDataService.complexArraySetup(null, 'empty');
          articleData[index] = newParagraph.concat(complexArray);
        } else {
          complexArray = ArticleDataService.complexArraySetup(val, 'basic');
          articleData[index] = complexArray;
          for (var i = 0; i < routeList.length; i++) {
            if (index == routeList[i].index) {
              var stringSearch = new RegExp(routeList[i].searchParameter);
              if (placeHolder == null) {
                paragraph = val;
              } else {
                paragraph = placeHolder;
              }
              if (paragraph.split(stringSearch)[1]) {
                if (paragraph.split(stringSearch)[0] != "") {
                  complexArray = ArticleDataService.complexArraySetup([routeList[i].name, routeList[i].route, paragraph.split(stringSearch)[0]], 'route');
                } else {
                  complexArray = ArticleDataService.complexArraySetup([routeList[i].name, routeList[i].route], 'route');
                }
                placeHolder = paragraph.split(stringSearch)[1];
                newParagraph = newParagraph.concat(complexArray);
                if (i == routeList.length - 1) {
                  complexArray = ArticleDataService.complexArraySetup(placeHolder, 'basic');
                  articleData[index] = newParagraph.concat(complexArray);
                  newParagraph = [];
                  placeHolder = null;
                }
              } else if (i == routeList.length - 1) {
                complexArray = ArticleDataService.complexArraySetup(placeHolder, 'basic');
                articleData[index] = newParagraph.concat(complexArray);
                newParagraph = [];
                placeHolder = null;
              } else {
                complexArray = ArticleDataService.complexArraySetup(placeHolder, 'basic');
              }
              if (complexArray[0].text == null) {
                complexArray = ArticleDataService.complexArraySetup(val, 'basic');
                articleData[index] = newParagraph.concat(complexArray);
                newParagraph = [];
                placeHolder = null;
              }
            } else {
              if (placeHolder != null) {
                if (placeHolder.charAt(0) != "," && placeHolder.charAt(0) != "." && placeHolder.charAt(0) != "'") {
                  complexArray = ArticleDataService.complexArraySetup(placeHolder, 'basic');
                } else {
                  complexArray = ArticleDataService.complexArraySetup(placeHolder, 'basic');
                }
                articleData[index] = newParagraph.concat(complexArray);
                newParagraph = [];
                placeHolder = null;
              }
            }
          }
        }
      }
    });
  }// end main article data processing

  //recommendations data processing
  getRecommendationsData(eventID, scope) {
    var articleScope = scope == 'ncaaf' ? 'fbs' : scope;
    var fullUrl = GlobalSettings.getArticleUrl() + "articles?&event=" + eventID + "&scope=" + articleScope + "&count=10&readyToPublish=true&random=1";
    return this.model.get(fullUrl)
      .map(data => ArticleDataService.formatRecommendedData(data.data, scope));
  }

  static formatRecommendedData(data, scope) {
    var result = [];
    var headlineData = data;
    if (headlineData) {
      for (var i = 3; i > result.length && headlineData.length;) {
        let j = headlineData.length;
        let rand = Math.floor(Math.random() * j);
        if (headlineData[rand].article_data != null) {
          var eventType = headlineData[rand]['article_data'].report_type;
          var eventId = eventType != "player-fantasy" ? headlineData[rand].event_id.toString() : headlineData[rand].article_id.toString();
          result.push(ArticleDataService.getRandomArticles(headlineData[rand], eventType, eventId, scope));
          headlineData.splice(rand, 1);
        }
      }
    }
    return result.length == 3 ? result : null;
  }

  static getRandomArticles(recommendations, pageIndex, eventID, scope) {
    return {
      title: recommendations.title,
      eventType: pageIndex,
      eventID: eventID,
      images: VerticalGlobalFunctions.getBackgroundImageUrlWithStockFallback(recommendations.image_url, GlobalSettings._imgRecommend),
      date: GlobalFunctions.sntGlobalDateFormatting(recommendations.last_updated * 1000, "dayOfWeek"),
      articleUrl: VerticalGlobalFunctions.formatArticleRoute(scope, pageIndex, eventID),
      keyword: recommendations.keywords[0].toUpperCase()
    };
  }//end recommendations data processing

  //trending data processing
  getAiTrendingData(batch, scope) {
    if (batch == null) {
      batch = 1;
    }
    var articleScope = scope == 'ncaaf' ? 'fbs' : scope;
    var fullUrl = GlobalSettings.getArticleUrl();
    return this.model.get(fullUrl + "articles?page=" + batch + "&count=10&scope=" + articleScope + "&articleType=postgame-report")
      .map(data => data);
  }

  transformTrending(data, currentArticleId, scope, isArticle) {
    var articles = [];
    data.forEach(function (val) {
      var articleData;
      if (val.event_id != currentArticleId) {
        let rawUrl = isBrowser ? window.location.protocol + "//" + window.location.host : GlobalSettings._proto + "//" + GlobalSettings._globalSiteUrl;
        val["date"] = isArticle ? GlobalFunctions.sntGlobalDateFormatting(moment.unix(Number(val.last_updated)), "timeZone") :
          GlobalFunctions.sntGlobalDateFormatting(moment.unix(Number(val.publishedDate) / 1000), "timeZone");
        articleData = {
          author: val['author'],
          publisher: val['publisher'],
          title: val.title,
          date: val["date"],
          teaser: val.teaser,
          eventId: isArticle ? val.event_id : val.id,
          eventType: isArticle ? "postgame-report" : "story",
          image: isArticle ? GlobalSettings.getImageUrl(val.image_url, GlobalSettings._imgTrending) : GlobalSettings.getImageUrl(val.imagePath, GlobalSettings._imgTrending),
          url: isArticle ?
            VerticalGlobalFunctions.formatArticleRoute(scope, val.article_type, val.event_id) :
            VerticalGlobalFunctions.formatArticleRoute(scope, 'story', val.id),
          rawUrl: isArticle ?
          rawUrl + "/" + scope + "/articles/postgame-report/" + val.event_id :
          rawUrl + "/" + scope + "/articles/story/" + val.id
        };
        if (articleData != null) {
          articles.push(articleData);
        }
      }
    });
    return articles;
  }//end trending data processing

  //headline data processing
  getAiHeadlineData(scope, teamID, isLeague) {
    var fullUrl = GlobalSettings.getArticleDataUrl();
    var aiScope = scope == 'ncaaf' ? 'fbs' : scope;
    return this.model.get(fullUrl + 'headlines?scope=' + aiScope + '&team=' + teamID)
      .map(headlineData => this.processHeadlineData(headlineData.data, aiScope, teamID, isLeague))
      .catch(err=> {
        console.log('Error', err);
        return Observable.throw(err);
      });
  }

  getAiHeadlineDataLeague(count, scope, isLeague) {
    if (count == null) {
      count = 10;
    }
    var aiScope = scope == 'ncaaf' ? 'fbs' : scope;
    var fullUrl = GlobalSettings.getArticleUrl();
    return this.model.get(fullUrl + "articles?page=1&count=" + count + "&scope=" + aiScope + "&articleType=postgame-report")
      .map(headlineData => this.processHeadlineData(headlineData.data, aiScope, null, isLeague))
      .catch(err=> {
        console.log('Error', err);
        return Observable.throw(err);
      });
  }

  processHeadlineData(data, scope, teamID, isLeague) {
    try {
      var scheduleData = !isLeague ? ArticleDataService.getScheduleData(data.home, data.away, scope, teamID) : null;
      var mainArticleData = this.getMainArticle(data, scope, isLeague);
      var subArticleData = ArticleDataService.getSubArticles(data, data.event, scope, isLeague);
      return {
        home: {
          id: !isLeague ? data['home'].id : null,
          name: !isLeague ? data['home'].name : null
        },
        away: {
          id: !isLeague ? data['away'].id : null,
          name: !isLeague ? data['away'].name : null
        },
        timestamp: data.timestamp,
        scheduleData: scheduleData,
        mainArticleData: mainArticleData,
        subArticleData: subArticleData
      }
    } catch (err) {
      console.log('Error', err);
      return null
    }
  }

  static getScheduleData(home, away, scope, teamID) {
    var homeData = [];
    var awayData = [];
    var val = [];
    val['homeID'] = home.id;
    val['homeName'] = home.name;
    val['homeLocation'] = home.location;
    val['homeHex'] = home.hex;
    if (teamID == home.id) {
      val['homeLogo'] = ArticleDataService.setImageLogo(home.logo, true);
    } else {
      let homeLink = VerticalGlobalFunctions.formatTeamRoute(scope, home.location + ' ' + home.name, home.id);
      val['url'] = homeLink;
      val['homeLogo'] = ArticleDataService.setImageLogo([home.logo, homeLink], false);
    }
    val['homeWins'] = home.wins;
    val['homeLosses'] = home.losses;
    homeData.push(val);
    val = [];
    val['awayID'] = away.id;
    val['awayName'] = away.name;
    val['awayLocation'] = away.location;
    val['awayHex'] = away.hex;
    if (teamID == away.id) {
      val['awayLogo'] = ArticleDataService.setImageLogo(away.logo, true);
    } else {
      let awayLink = VerticalGlobalFunctions.formatTeamRoute(scope, away.location + ' ' + away.name, away.id);
      val['url'] = awayLink;
      val['awayLogo'] = ArticleDataService.setImageLogo([away.logo, awayLink], false);
    }
    val['awayWins'] = away.wins;
    val['awayLosses'] = away.losses;
    awayData.push(val);
    var gradient = ArticleDataService.gradientSetup(awayData[0], homeData[0]);
    return {
      gradient: gradient,
      awayData: awayData[0],
      homeData: homeData[0]
    }

  }

  static gradientSetup(away, home) {
    if (typeof home != 'undefined' && typeof away != 'undefined') {
      var fullGradient = Gradient.getGradientStyles([away.awayHex, home.homeHex], .75);
      var gradient = fullGradient ? fullGradient : null;
      var defaultGradient = fullGradient ? null : 'default-gradient';
    } else {
      var gradient = null;
      var defaultGradient = 'default-gradient';
    }
    return {
      fullGradient: gradient,
      defaultGradient: defaultGradient
    }
  }

  getMainArticle(data, scope, isLeague) {
    try {
      var fullIndex, articleContent;
      if (!isLeague && data['featuredReport'] != undefined) {
        this.pageIndex = Object.keys(data['featuredReport'])[0];
        fullIndex = data['featuredReport'][this.pageIndex][0];
        articleContent = fullIndex.teaser;
      } else if (!isLeague) {
        this.pageIndex = 'about-the-teams';
        fullIndex = data['otherReports'][this.pageIndex];
        articleContent = fullIndex.teaser;
      } else {
        this.pageIndex = "postgame-report";
        articleContent = data[0].teaser;
      }
      var trimmedArticle = articleContent.substring(0, 1000);
      return {
        keyword: !isLeague ? ArticleDataService.setFeatureType(this.pageIndex) : "POSTGAME",
        mainTitle: !isLeague ? fullIndex.title : data[0].title,
        eventType: this.pageIndex,
        mainContent: trimmedArticle.substr(0, Math.min(trimmedArticle.length, trimmedArticle.lastIndexOf(" "))),
        mainImage: VerticalGlobalFunctions.getBackgroundImageUrlWithStockFallback(!isLeague ?
          fullIndex.image_url : data[0].image_url, VerticalGlobalFunctions._imgRecMd),
        articleUrl: VerticalGlobalFunctions.formatArticleRoute(scope, this.pageIndex, !isLeague ?
          fullIndex.event_id : data[0].event_id),
        mainHeadlineId: isLeague ? data[0].event_id : null
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  static getSubArticles(data, eventID, scope, isLeague) {
    var articles;
    var articleArr = [];
    if(data['otherReports']){
      var dataSet = !isLeague ? Object.keys(data['otherReports']) : data;
      dataSet.forEach(function (val) {
        if (eventID != (isLeague ? val.event_id : 0)) {
          articles = {
            title: !isLeague ? data['otherReports'][val].title : val.title,
            eventType: !isLeague ? val : "postgame-report",
            eventID: !isLeague ? (val != "player-fantasy" ? eventID : data['otherReports'][val].article_id) : val.event_id,
            images: VerticalGlobalFunctions.getBackgroundImageUrlWithStockFallback(!isLeague ? data['otherReports'][val].image_url : val.image_url, VerticalGlobalFunctions._imgRecSm),
            articleUrl: VerticalGlobalFunctions.formatArticleRoute(scope, !isLeague ? val : "postgame-report", !isLeague ?
            (val != "player-fantasy" ? eventID : data['otherReports'][val].article_id) : val.event_id)
          };
          articleArr.push(articles);
        }
      });
      articleArr.sort(function () {
        return 0.5 - Math.random()
      });
      return articleArr;
    }else{
      return null;
    }
  }//end headline data processing

  //fantasy module data processing
  getFantasyReport(playerId) {
    var fullUrl = GlobalSettings.getArticleUrl() + "articles?articleType=player-fantasy&scope=nfl&player[]=";
    if (playerId !== undefined) {
      fullUrl += playerId;
    }
    return this.model.get(fullUrl)
      .map(fantasyData => ArticleDataService.formatFantasyData(fantasyData))
      .catch(err=> {
        console.log('Error', err);
        return Observable.throw(err);
      });
  }// end fantasy module data processing

  static formatFantasyData(data) {
    try {
      if (data.data == null) {
        return null;
      } else {
        data = data.data[0];
        var date = moment.unix(data['last_updated']).format();
        date = moment.tz(date, "America/New_York").fromNow();
        return {
          backgroundImage: GlobalSettings.getImageUrl(data['article_data']['images'][0].image_url),
          profileImage: GlobalSettings.getImageUrl(data['article_data'].headshot_image),
          articleUrl: VerticalGlobalFunctions.formatArticleRoute("nfl", "player-fantasy", data['article_id']),
          fantasyDate: date,
          title: data.title,
          teaser: data.teaser,
          playerId: data.player_id
        }
      }
    } catch (e) {
      console.warn('Insufficient data for Fantasy Report');
      return null;
    }
  }

  //data configuring functions
  static setImageLogo(data, isHome):any {
    if (isHome) {
      return {
        imageClass: "image-66",
        mainImage: {
          imageUrl: GlobalSettings.getImageUrl(data, GlobalSettings._imgMdLogo),
          imageClass: "border-logo"
        }
      }
    } else {
      return {
        imageClass: "image-66",
        mainImage: {
          imageUrl: GlobalSettings.getImageUrl(data[0], GlobalSettings._imgMdLogo),
          urlRouteArray: data[1],
          hoverText: "<i class='fa fa-mail-forward'></i>",
          imageClass: "border-logo"
        }
      }
    }
  }

  getRandomArticles(articles, scope, type) {
    articles = [
      'pregame-report',
      'upcoming-games',
      'about-the-teams',
      'historical-team-statistics',
      'last-matchup',
      'starting-roster-home-offense',
      'starting-roster-home-defense',
      'starting-roster-home-special-teams',
      'starting-roster-away-offense',
      'starting-roster-away-defense',
      'starting-roster-away-special-teams',
      'quarterback-player-comparison',
      'running-back-player-comparison',
      'wide-receiver-player-comparison',
      'tight-end-player-comparison',
      'defense-player-comparison',
      'player-fantasy'
    ];
    if (scope == "nfl") {
      articles.push('injuries-home', 'injuries-away');
    }
    var findCurrent = articles.indexOf(type);
    articles.splice(findCurrent, 1);
    articles.sort(function () {
      return 0.5 - Math.random()
    });
    return articles;
  }

  getApiArticleType(type) {
    var articleType;
    switch (type) {
      case "pregame-report":
        return articleType = "articleType=pregame-report";
      case "in-game-report":
        return articleType = "articleType=in-game-report";
      case "postgame-report":
        return articleType = "articleType=postgame-report";
      case "upcoming-games":
        return articleType = "articleType=upcoming-games";
      case "about-the-teams":
        return articleType = "articleType=about-the-teams";
      case "historical-team-statistics":
        return articleType = "articleType=historical-team-statistics";
      case "last-matchup":
        return articleType = "articleType=last-matchup";
      case "rosters":
        return articleType = "articleType=player-fantasy";
      case "injuries":
        return articleType = "articleType=player-fantasy";
      case "player-comparisons":
        return articleType = "articleType=player-fantasy";
      case "player-daily-udate":
        return articleType = "articleType=player-fantasy";
      case "player-fantasy":
        return articleType = "articleType=player-fantasy";
      case "starting-roster-home-offense":
        return articleType = "articleSubType=starting-roster-home-offense";
      case "starting-roster-home-defense":
        return articleType = "articleSubType=starting-roster-home-defense";
      case "starting-roster-home-special-teams":
        return articleType = "articleSubType=starting-roster-home-special-teams";
      case "starting-roster-away-offense":
        return articleType = "articleSubType=starting-roster-away-offense";
      case "starting-roster-away-defense":
        return articleType = "articleSubType=starting-roster-away-defense";
      case "starting-roster-away-special-teams":
        return articleType = "articleSubType=starting-roster-away-special-teams";
      case "injuries-home":
        return articleType = "articleSubType=injuries-home";
      case "injuries-away":
        return articleType = "articleSubType=injuries-away";
      case "quarterback-player-comparison":
        return articleType = "articleSubType=quarterback-player-comparison";
      case "running-back-player-comparison":
        return articleType = "articleSubType=running-back-player-comparison";
      case "wide-receiver-player-comparison":
        return articleType = "articleSubType=wide-receiver-player-comparison";
      case "tight-end-player-comparison":
        return articleType = "articleSubType=tight-end-player-comparison";
      case "defense-player-comparison":
        return articleType = "articleSubType=defense-player-comparison";
    }
  }

  static getArticleType(articleType) {
    var articleInformation = [];
    switch (articleType) {
      case "pregame-report":
        return articleInformation = ["pregame-report", "gameReport", "null"];
      case "in-game-report":
        return articleInformation = ["in-game-report", "gameReport", "null"];
      case "postgame-report":
        return articleInformation = ["postgame-report", "gameReport", "null"];
      case "upcoming-games":
        return articleInformation = ["upcoming-games", "game_module", "null"];
      case "about-the-teams":
        return articleInformation = ["about-the-teams", "teamRecord", "about"];
      case "historical-team-statistics":
        return articleInformation = ["historical-team-statistics", "teamRecord", "history"];
      case "last-matchup":
        return articleInformation = ["last-matchup", "teamRecord", "last"];
      case "player-fantasy":
        return articleInformation = ["player-fantasy", "gameReport", "null"];
      case "starting-roster-home-offense":
        return articleInformation = ["starting-roster-home-offense", "playerRoster", "null"];
      case "starting-roster-home-defense":
        return articleInformation = ["starting-roster-home-defense", "playerRoster", "null"];
      case "starting-roster-home-special-teams":
        return articleInformation = ["starting-roster-home-special-teams", "playerRoster", "null"];
      case "starting-roster-away-offense":
        return articleInformation = ["starting-roster-away-offense", "playerRoster", "null"];
      case "starting-roster-away-defense":
        return articleInformation = ["starting-roster-away-defense", "playerRoster", "null"];
      case "starting-roster-away-special-teams":
        return articleInformation = ["starting-roster-away-special-teams", "playerRoster", "null"];
      case "injuries-home":
        return articleInformation = ["injuries-home", "playerRoster", "null"];
      case "injuries-away":
        return articleInformation = ["injuries-away", "playerRoster", "null"];
      case "quarterback-player-comparison":
        return articleInformation = ["quarterback-player-comparison", "playerComparison", "null"];
      case "running-back-player-comparison":
        return articleInformation = ["running-back-player-comparison", "playerComparison", "null"];
      case "wide-receiver-player-comparison":
        return articleInformation = ["wide-receiver-player-comparison", "playerComparison", "null"];
      case "tight-end-player-comparison":
        return articleInformation = ["tight-end-player-comparison", "playerComparison", "null"];
      case "defense-player-comparison":
        return articleInformation = ["defense-player-comparison", "playerComparison", "null"];
    }
  }

  static setFeatureType(pageIndex) {
    switch (pageIndex) {
      case'pregame-report':
        return 'PREGAME';
      case'postgame-report':
        return 'POSTGAME';
      case 'about-the-teams':
        return 'ABOUT THE TEAMS';
      default:
        return 'LIVE';
    }
  }

  static checkData(data) {
    return data
  }//end data configuring functions
}
