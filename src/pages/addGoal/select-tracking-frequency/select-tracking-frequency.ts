import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {ConfigureNotificationsPage} from "../configure-notifications/configure-notifications";
import {HomePage} from "../../home/home";

/**
 * Generated class for the SelectTrackingFrequencyPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-select-tracking-frequency',
  templateUrl: 'select-tracking-frequency.html',
})
export class SelectTrackingFrequencyPage {

  recommended;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  getGoals(goals){
    for(let i=0; i<goals.length; i++){
      if (goals[i].indexOf("Learning") >= 0 || goals[i].indexOf("Predicting") >= 0){
        this.recommended = "regular";
        break;
      }
      if (goals[i].indexOf("Monitoring") >= 0){
        this.recommended = "post symptoms"
      }
    }
  }

  ionViewDidLoad() {
    this.getGoals(this.navParams.data.configPath[0].added);
  }

  configureNotifications(){
    this.navParams.data['trackingFreq'] = 'regular';
    this.navCtrl.push(ConfigureNotificationsPage, this.navParams.data);
  }

  finish(){
    this.navParams.data['trackingFreq'] = 'postSymptoms';
    this.navCtrl.push(HomePage, this.navParams.data);
  }

}
