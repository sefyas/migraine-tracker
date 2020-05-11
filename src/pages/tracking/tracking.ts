import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {HomePage} from "../home/home";

/**
 * Generated class for the TrackingPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

// @IonicPage()
@Component({
  selector: 'page-tracking',
  templateUrl: 'tracking.html',
})
export class TrackingPage {

  private dataToTrack : any;
  private dateSelected : any;
  private goal : any;
  private neighborData: any;

  monthNames : string[] = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];

  constructor(public navCtrl: NavController,
              public navParams: NavParams) {
    this.dataToTrack = navParams.get('dataToTrack');
    this.dateSelected = navParams.get('dateSelected');
    this.goal = navParams.get('goal');
    this.neighborData = navParams.get('neighborData');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad TrackingPage');
    console.log(this.dateSelected);
    console.log(this.dataToTrack);
    console.log(this.goal)
  }

  onHomeClick() {
    this.navCtrl.popToRoot();
  }

  onPreviousClick() {
    var dataToSend = {"goal": this.neighborData[this.goal][0],
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": this.neighborData};
    this.navCtrl.push(TrackingPage, dataToSend, {direction: "back"});
  }

  onNextClick() {
    var dataToSend = {"goal": this.neighborData[this.goal][1],
                      "dataToTrack": this.dataToTrack,
                      "dateSelected": this.dateSelected,
                      "neighborData": this.neighborData};
    this.navCtrl.push(TrackingPage, dataToSend, {direction: "forward"});
  }


}
