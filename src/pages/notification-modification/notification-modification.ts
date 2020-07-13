import {Component, ViewChild} from '@angular/core';
import {NavController, NavParams, ViewController} from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {DataDetailsServiceProvider} from "../../providers/data-details-service/data-details-service";
import {SelectTrackingFrequencyPage} from "../addGoal/select-tracking-frequency/select-tracking-frequency";
import {Notification} from "../../interfaces/customTypes";
import {GoalDetailsServiceProvider} from "../../providers/goal-details-service/goal-details-service";
import {HomePage} from "../home/home";

@Component({
  selector: 'page-notification-modification',
  templateUrl: 'notification-modification.html',
})

export class NotificationModificationPage {
  private configuredRoutine : any = {};
  private allGoals : any;
  private notificationData : {[notificationType:string]: Notification} = {};
  private recommended : string = "retroactive";
  private postSymptomInfoDisplayed : any = false;
  private regularInfoDisplayed : any = false;
  private saved : boolean = true;


  days : number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
    25, 26, 27, 28, 29, 30, 31];

  @ViewChild('weekdayPicker') weekdayPicker;

  constructor(public navCtrl: NavController,
              public viewCtrl: ViewController,
              public navParams: NavParams,
              public couchDBService: CouchDbServiceProvider,
              private goalDetails: GoalDetailsServiceProvider) {
  }

  async ionViewDidLoad() {
    this.configuredRoutine = await this.couchDBService.fetchConfiguredRoutine();
    this.notificationData = this.configuredRoutine['notifications'];

    this.allGoals = this.configuredRoutine ? this.configuredRoutine['goals'] : [];
    this.allGoals = this.allGoals.concat(this.configuredRoutine['goals'] ? this.configuredRoutine['goals'] : []);
    this.recommended = this.getRecommendation(this.allGoals);

    // if there are configured notifications, display those
    if (this.configuredRoutine['notifications'] && this.configuredRoutine['notifications'] !== {}) {
      this.notificationData = this.configuredRoutine['notifications'];
    } else {
      if (this.recommended === 'retroactive') {
        this.notificationData['retroactive'] = {'delayScale': 'Day', 'delayNum': 1};
      } else if (this.recommended === 'retroactive') {
        this.notificationData['regular'] = {'delayScale': 'Daily', 'timeOfDay': "18:00"};
      }
    }
  }

  onClickNext() {
    this.couchDBService.logConfiguredRoutine(this.configuredRoutine);
    this.saved = true;
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

  selectPostSymptom() {
    if (this.notificationData['retroactive']) {
      this.notificationData['retroactive'] = null;
    } else {
      this.notificationData['retroactive'] = {};
      this.notificationData['regular'] = null;
    }
    this.saved = false;
  }

  selectRegular() {
    if (this.notificationData['regular']) {
      this.notificationData['regular'] = null;
    } else {
      this.notificationData['regular'] = {};
      this.notificationData['retroactive'] = null;
    }
    this.saved = false;
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
    this.saved = false;
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
    this.saved = false;
  }

  getRecommendation(goals : string[]){
    for(let i=0; i<goals.length; i++){
      if(this.goalDetails.getGoalByID(goals[i])['suggestedFrequency'] === "regular"){
        return 'regular';
      }
    }
    return 'retroactive';
  }

  canContinue() {
    if (this.notificationData['retroactive']) {
      if (!this.notificationData['retroactive']['delayNum']) return false;
      if (!this.notificationData['retroactive']['delayScale']) return false;
    }

    if (this.notificationData['regular']) {
      if (!this.notificationData['regular']['timescale']) return false;
      if (!this.notificationData['regular']['timeOfDay']) return false;
      if (this.notificationData['regular']['timescale']==='Monthly' &&
          !this.notificationData['regular']['dayOfMonth']) return false;
      if(this.notificationData['regular']['timescale']==='Weekly' &&
          !this.notificationData['regular']['dayOfWeek']) return false;
    }
    return true;
  }
}
