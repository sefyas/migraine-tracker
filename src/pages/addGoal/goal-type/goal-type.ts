import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { GoalDetailsServiceProvider } from "../../../providers/goal-details-service/goal-details-service";
import { DataConfigPage } from "../data-config/data-config";
import { DataDetailsServiceProvider } from "../../../providers/data-details-service/data-details-service";
import { CouchDbServiceProvider } from "../../../providers/couch-db-service/couch-db-service";
import { GoalModificationPage } from "../../goal-modification/goal-modification";
import { Goal } from "../../../interfaces/customTypes";

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
    if (this.modifying) {
      this.expandMonitor = true;
      this.expandLearn = true;
    }

    let configuredRoutine = await this.couchDbService.getConfiguredRoutine().then((val) => {
      return val;
    });
    if (configuredRoutine !== null) {
      this.selectedGoals = configuredRoutine['goals'];
      this.textGoals = configuredRoutine.textGoals;
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
    let selectedConfigData = this.dataDetails.getSelectedConfigData(this.selectedGoals);
    let dataToSend = await this.couchDbService.getConfiguredRoutine().then((val) => {
      return val;
    });

    // console.log("!!!!!!!!!!!!!!!!!!!!!!");
    // console.log(dataToSend);
    // let dataToSend = {'goals': this.selectedGoals,
    //   'textGoals': this.textGoals,
    //   'selectedConfigData': selectedConfigData,
    //   'modifying': this.modifying,
    //   'configuredRoutine': configuredRoutine};

    dataToSend['goals'] = this.selectedGoals;
    dataToSend['textGoals'] = this.textGoals;
    dataToSend['selectedConfigData'] = selectedConfigData;
    dataToSend['modifying'] = this.modifying;

    if (exit) {
      dataToSend['goalsOnly'] = true;
      this.navCtrl.setRoot(GoalModificationPage, dataToSend);
    } else{
      let configData = this.dataDetails.findNextConfigData(this.selectedGoals, null);

      if (configData!== null) {
        dataToSend['dataPage'] = configData;
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
