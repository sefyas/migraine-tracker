import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { GoalDetailsServiceProvider } from "../../../providers/goal-details-service/goal-details-service";
import { DataConfigPage } from "../data-config/data-config";
import { DataDetailsServiceProvider } from "../../../providers/data-details-service/data-details-service";
import { CouchDbServiceProvider } from "../../../providers/couch-db-service/couch-db-service";
import { GoalModificationPage } from "../../goal-modification/goal-modification";
import { Goal } from "../../../interfaces/customTypes";
import {SelectTrackingFrequencyPage} from "../select-tracking-frequency/select-tracking-frequency";

@Component({
  selector: 'page-goal-type',
  templateUrl: 'goal-type.html',
})

export class GoalTypePage {
  private goalList : Goal[];
  private modifying : boolean = false;
  private selectedGoals : string[] = [];
  private textGoals : string;
  private textGoalExpand : boolean = false;
  private expandMonitor : boolean = false;
  private expandLearn : boolean = false;
  private displayTextGoalEditBtn : boolean = true;

  constructor(private navCtrl: NavController,
              public navParams: NavParams,
              private couchDbService: CouchDbServiceProvider,
              private goalDetailsServiceProvider: GoalDetailsServiceProvider,
              private dataDetails: DataDetailsServiceProvider) {}

  async ionViewDidLoad() {
    this.modifying = this.navParams.data['modifying'];
    let activeGoals = await this.couchDbService.getConfiguredRoutine().then((val) => {
      return val;
    });
    if (activeGoals !== null) {
      this.selectedGoals = activeGoals['goals'];
      this.textGoals = activeGoals.textGoals;
      this.textGoalExpand = true;
    }
    this.goalList = this.goalDetailsServiceProvider.getGoalList();
  }

  addGoal(subgoal : Goal = null) {
    this.selectedGoals.push(subgoal.goalID);
  }

  removeGoal(subgoal : Goal = null) {
    this.selectedGoals.splice(this.selectedGoals.indexOf(subgoal.goalID), 1);
  }

  expandGoal(goal : Goal) {
    if (goal.name === "Monitoring") {
      this.expandMonitor = !this.expandMonitor;
    } else if (goal.name === "Learning") {
      this.expandLearn = !this.expandLearn;
    }
  }

  async continueSetup(exit=false) {
    // this.selectedGoals = ['1a', '1b', '1c', '2a', '2b', '2c', '3'];
    let selectedConfigData = this.dataDetails.getSelectedConfigData(this.selectedGoals);
    let dataToSend = {'goalIDs': this.selectedGoals, 'textGoals': this.textGoals,
      'selectedConfigData': selectedConfigData};
    if (exit) {
      dataToSend['goalsOnly'] = true;
      this.navCtrl.setRoot(GoalModificationPage, dataToSend);
    } else{
      let configData = this.dataDetails.findNextConfigData(this.selectedGoals, null);

      if (configData!== null) {
        dataToSend['dataPage'] = configData;
        // this.navCtrl.push(SelectTrackingFrequencyPage, dataToSend, {animate: false});
        this.navCtrl.push(DataConfigPage, dataToSend, {animate: false});
      } else {
        let error = new Error("All data conditional, no conditions met.");
        throw(error);
      }
    }
    // this.couchDBService.addGoals(dataToSend["goalIDs"]);
  }

  expandTextGoal() {
      this.textGoalExpand = !this.textGoalExpand;
  }

  onEditTextGoalFocus() {
    this.displayTextGoalEditBtn = false;
  }

  onEditTextGoalBlur() {
    this.displayTextGoalEditBtn = true;
  }

  onClickPrevious() {
    this.navCtrl.pop({animate: false});
  }
}
