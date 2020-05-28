import {Component, ViewChild} from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';
import { HomePage } from "../../home/home";
import { GoalModificationPage } from "../../goal-modification/goal-modification";
import { CouchDbServiceProvider } from "../../../providers/couch-db-service/couch-db-service";
import { GoalDetailsServiceProvider } from "../../../providers/goal-details-service/goal-details-service";
import { Notification } from "../../../interfaces/customTypes";
import { ConfiguredRoutine } from "../../../interfaces/customTypes";
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
  // dataChanged : boolean = false;
  // hasActiveGoals : boolean;
  // dates : Number[];
  // days : string[];
  // expansions : {[expansionName:string] : boolean} = {'retroactive': false, 'regular': false};
  // 'delayScale': false, 'timescale': false, 'dayOfWeek':false, 'dayOfMonth': false};
  // this.dates = Array.from(new Array(31), (x,i) => i + 1);
  // this.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  private isModal : boolean;
  private activeGoals : any;
  private allGoals : any;
  private notificationData : {[notificationType:string]: Notification} = {};
  private recommended : string = "retroactive";
  private postSymptomInfoDisplayed : any = false;
  private regularInfoDisplayed : any = false;

  @ViewChild('weekdayPicker') weekdayPicker;

  constructor(public navCtrl: NavController,
              public viewCtrl: ViewController,
              public navParams: NavParams,
              public couchDbService: CouchDbServiceProvider,
              private goalDetails: GoalDetailsServiceProvider) {
  }

  async ionViewDidLoad() {
    this.activeGoals = await this.couchDbService.getConfiguredRoutine().then((val) => {
      return val;
    });
    this.allGoals = this.activeGoals ? this.activeGoals['goals'] : [];
    this.allGoals = this.allGoals.concat(this.navParams.data['goalIDs'] ? this.navParams.data['goalIDs'] : []);
    this.recommended = this.getRecommendation(this.allGoals);

    if (this.activeGoals) { // if they have configured notifications, display those
      this.notificationData = this.activeGoals['notifications'];
    } else {
      if (this.recommended === 'retroactive') {
        this.notificationData['retroactive'] = {'delayScale': 'Day', 'delayNum': 1};
      } else if (this.recommended === 'retroactive') {
        this.notificationData['regular'] = {'delayScale': 'Daily', 'timeOfDay': "18:00"};
      }
    }
    this.isModal = this.navParams.data['isModal'];
  }

  onClickPrevious() {
    this.navCtrl.pop({animate: false});
  }

  onClickContinue() {
    if (this.isModal) {
      this.viewCtrl.dismiss(this.notificationData);
    } else {
      this.navParams.data['notifications'] = this.notificationData;
      if (this.activeGoals) {
        this.navCtrl.setRoot(GoalModificationPage, this.navParams.data);
      } else {
        this.navCtrl.setRoot(HomePage, this.navParams.data);
      }
    }
    this.couchDbService.logConfiguredRoutine(this.navParams['data']);
  }

  selectPostSymptom() {
    if (this.notificationData['retroactive']) {
      this.notificationData['retroactive'] = null;
    } else {
      this.notificationData['retroactive'] = {};
      this.notificationData['regular'] = null;
    }
  }

  selectRegular() {
    if (this.notificationData['regular']) {
      this.notificationData['regular'] = null;
    } else {
      this.notificationData['regular'] = {};
      this.notificationData['retroactive'] = null;
    }
  }

  onCloseInfoClick() {
    this.postSymptomInfoDisplayed = false;
    this.regularInfoDisplayed = false;
  }

  onDisplayInfoClick(type : string) {
    if (type === "postSymptom") {
      this.postSymptomInfoDisplayed = true;
    } else if (type === "regular") {
      this.regularInfoDisplayed = true;
    }
  }

  getRecommendation(goalIDs : string[]){
    for(let i=0; i<goalIDs.length; i++){
      if(this.goalDetails.getGoalByID(goalIDs[i])['suggestedFrequency'] === "regular"){
        return 'regular';
      }
    }
     return 'retroactive';
  }

  setPostSymptomDelayScale(type : string) {
    if (type === 'Day') {
      if (this.notificationData['retroactive'].delayScale !== 'Day') {
        this.notificationData['retroactive'].delayScale = 'Day';
      } else {
        this.notificationData['retroactive'].delayScale = null;
      }
    } else if (type === 'Hour') {
      if (this.notificationData['retroactive'].delayScale !== 'Hour') {
        this.notificationData['retroactive'].delayScale = 'Hour';
      } else {
        this.notificationData['retroactive'].delayScale = null;
      }
    }
  }

  setRegularTimeScale(type : string) {
    if (type === 'Daily') {
      if (this.notificationData['regular'].timescale !== 'Daily') {
        this.notificationData['regular'].timescale = 'Daily';
      } else {
        this.notificationData['regular'].timescale = null;
      }
    } else if (type === 'Weekly') {
      if (this.notificationData['regular'].timescale !== 'Weekly') {
        this.notificationData['regular'].timescale = 'Weekly';
      } else {
        this.notificationData['regular'].timescale = null;
      }
    } else if (type === 'Monthly') {
      if (this.notificationData['regular'].timescale !== 'Monthly') {
        this.notificationData['regular'].timescale = 'Monthly';
      } else {
        this.notificationData['regular'].timescale = null;
      }
    }
  }






  //
  // isSelected(type : string, element : string, val : any) : boolean{
  //   return this.notificationData[type][element] && this.notificationData[type][element].indexOf(val) >-1;
  // }
  //
  // changeVal(type : string, element : string, val : any, multi=false){
  //   this.dataChanged = true;
  //   if(multi){
  //     if(!this.notificationData[type][element]) this.notificationData[type][element] = [val];
  //     else {
  //       let index = this.notificationData[type][element].indexOf(val);
  //       if (index > -1) this.notificationData[type][element].splice(index, 1);
  //       else this.notificationData[type][element].push(val);
  //     }
  //   }
  //   else{
  //     this.expansions[element] = false;
  //     this.notificationData[type][element] = val;
  //     if(type==='regular' && element === 'timescale'){ // otherwise we accidentally save irrelevant settings
  //       delete this.notificationData[type]['dayOfWeek'];
  //       delete this.notificationData[type]['dayOfMonth'];
  //     }
  //   }
  // }
  //
  //
  // addOrRemove(type){
  //   this.dataChanged = true;
  //   if(this.notificationData[type]){
  //     delete this.notificationData[type];
  //   }
  //   else{
  //     this.notificationData[type] = {};
  //   }
  //   this.expansions[type] = !this.expansions[type];
  // }
  //
  //
  // cancelChange(){
  //   this.viewCtrl.dismiss();
  // }
  //
  //
  // canContinue() {
  //   if (this.notificationData['retroactive']) {
  //     if (!this.notificationData['retroactive']['delayNum']) return false;
  //     if (!this.notificationData['retroactive']['delayScale']) return false;
  //   }
  //
  //   if (this.notificationData['regular']) {
  //     if (!this.notificationData['regular']['timescale']) return false;
  //     if (!this.notificationData['regular']['timeOfDay']) return false;
  //     if (this.notificationData['regular']['timescale']==='Monthly' &&
  //             (!this.notificationData['regular']['dayOfMonth'] ||
  //               this.notificationData['regular']['dayOfMonth'].length === 0)) return false;
  //     if(this.notificationData['regular']['timescale']==='Weekly' &&
  //             (!this.notificationData['regular']['dayOfWeek'] ||
  //               this.notificationData['regular']['dayOfWeek'].length === 0)) return false;
  //   }
  //   return true;
  // }


}
