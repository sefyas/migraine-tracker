import { Component } from '@angular/core';
import {NavParams, ViewController} from 'ionic-angular';
import {DataDetailsServiceProvider} from "../../../providers/data-details-service/data-details-service";
import {GoalDetailsServiceProvider} from "../../../providers/goal-details-service/goal-details-service";
import {DataElement, DataField} from "../../../interfaces/customTypes";

/**
 * Generated class for the EditDataPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-edit-data',
  templateUrl: 'edit-data.html',
})
export class EditDataPage {

  private data : DataElement = null;
  private dataType : string;
  private goalList = [];
  private fieldList : DataField[]= [];
  private allowsGoals: boolean;
  private recLimit : any = {};
  private displayDataInfo : boolean = false;
  private displayLimitInfo : boolean = false;

  constructor(public navParams: NavParams,
              public viewCtrl: ViewController,
              public dataDetails: DataDetailsServiceProvider,
              public goalDetails: GoalDetailsServiceProvider) {
    this.allowsGoals = navParams.data['allowsDataGoals'];
    this.dataType = navParams.data['dataType'];
    this.data = navParams.data['data'];

    if (this.data.recommendingGoals) this.getRecommendingGoals();
    if (!this.data.field && this.data.recommendedField) this.data.field = this.data.recommendedField;
    if (!this.data.goal) {
      if (this.data.suggestedGoal) {
        this.data.goal = Object.assign({}, this.data.suggestedGoal);
      } else{
        this.data.goal = {'freq': null, 'threshold': null, 'timespan': null};
      }
    }
    if (this.data.suggestedGoal) {
      this.recLimit = Object.assign({}, this.data.suggestedGoal);
    } else{
      this.recLimit = {'freq': null, 'threshold': null, 'timespan': null};
    }
  }

  ionViewDidLoad() {
    this.fieldList = this.dataDetails.getSupportedFields();
  }

  getRecommendingGoals(){
    for(let i=0; i<this.data.recommendingGoals.length; i++){
      if(this.navParams.data['selectedGoals'].indexOf(this.data.recommendingGoals[i]) > -1){
        let goal = this.goalDetails.getGoalByID(this.data.recommendingGoals[i], true, false);
        if(goal) this.goalList.push(goal['name']);
      }
    }
  }

  setDataField(field : DataField) {
    this.data.field = field['name'];

    if (this.data.field === this.data.recommendedField) {
      this.data.explanation = this.data['fieldDescription'];
      if (this.data.suggestedGoal && !this.data.goal['freq']) {
        this.data.goal = this.data.suggestedGoal;
      }
    }
    else {
      this.data.explanation = field['explanation'];
      this.data.goal = {'freq': null, 'threshold': null, 'timespan': null}; // because they don't make sense across fields
    }
  }

  removeDataField() {
    this.data.field = null;
    this.data.explanation = null;
    this.data.goal = {'freq': null, 'threshold': null, 'timespan': null};
  }

  setLimit(freq : string=null, timespan : string=null) {
    if (freq) {
      if (this.data.goal.freq !== freq) {
        this.data.goal.freq = freq;
      }
      else {
        this.data.goal.freq = null;
      }
    }

    if (timespan) {
      if (this.data.goal.timespan !== timespan) {
        this.data.goal.timespan = timespan;
      }
      else {
        this.data.goal.timespan = null;
      }
    }
  }

  removeLimit() {
    if (!this.data.goal.freq && !this.data.goal.threshold && !this.data.goal.timespan) {
      this.data.goal.freq = this.recLimit.freq;
      this.data.goal.threshold = this.recLimit.threshold;
      this.data.goal.timespan = this.recLimit.timespan;
    } else {
      this.data.goal.freq = null;
      this.data.goal.threshold = null;
      this.data.goal.timespan = null;
    }
  }

  backToConfig(choice : string){
    if (choice === 'add') {
      this.viewCtrl.dismiss(this.data);
    } else if (choice === 'remove') {
      this.viewCtrl.dismiss('remove');
    } else {
      this.viewCtrl.dismiss();
    }
  }

  onCloseInfoClick() {
    this.displayDataInfo = false;
    this.displayLimitInfo = false;
  }

  onDisplayInfoClick(type : string) {
    if (type === "data") {
      this.displayDataInfo = true;
    } else if (type === "limit") {
      this.displayLimitInfo = true;
    }
  }
}
