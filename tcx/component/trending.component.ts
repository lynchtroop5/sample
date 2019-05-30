import {Component, Input} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';

@Component({
    selector: 'trending-component',
    templateUrl: './trending.component.html'
})

export class TrendingComponent {
    public widgetPlace: string = "widgetForModule";
    @Input() currentArticleId:string;
    @Input() eventType:string;
    @Input() geoLocation:string;
    @Input() scope:string;
    @Input() trendingData:string;
    @Input() showLoading:boolean;
}
