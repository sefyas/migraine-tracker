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
  private modifyGoal : boolean = false;
  private selectedGoals : string[] = [];
  private textGoalExpand : boolean = false;
  private expandMonitor : boolean = false;
  private expandLearn : boolean = false;
  private displayTextGoalEditBtn : boolean = true;
  private configuredRoutine : any = {};
  private params : any = {};

  constructor(private navCtrl: NavController,
              public navParams: NavParams,
              private couchDbService: CouchDbServiceProvider,
              private goalDetailsServiceProvider: GoalDetailsServiceProvider,
              private dataDetails: DataDetailsServiceProvider) {}

  async ionViewDidLoad() {
    if (this.navParams.data.length !== 0 && this.navParams.data) { // from the goal modification page
      this.configuredRoutine = this.navParams.data.configuredRoutine;
      this.params = this.navParams.data.params;
    } else { // from the initial setup page
      this.configuredRoutine = await this.couchDbService.fetchConfiguredRoutine().then((val) => {
        return val;
      });
    }
    if (this.configuredRoutine) { // load existing configurations
      this.selectedGoals = this.configuredRoutine['goals'];
      this.textGoalExpand = true;
    } else { // initialize the goal configuration
      this.configuredRoutine = {};
    }
    if (this.params && this.params['modifyGoal']) {
      this.modifyGoal = true;
      this.expandMonitor = true;
      this.expandLearn = true;
    } else {
      this.modifyGoal = false;
    }
    this.goalList = this.goalDetailsServiceProvider.getGoalList(); // load all goals
  }

  /**
   * Select a goal
   * @param subgoal
   */
  addGoal(subgoal : Goal = null) {
    this.selectedGoals.push(subgoal.goalID);
  }

  /**
   * Deselect a goal
   * @param subgoal
   */
  removeGoal(subgoal : Goal = null) {
    this.selectedGoals.splice(this.selectedGoals.indexOf(subgoal.goalID), 1);
  }

  /**
   * Expand a goal with subgoals
   * @param goal
   */
  expandGoal(goal : Goal) {
    if (goal.name === "Monitoring") {
      this.expandMonitor = !this.expandMonitor;
    } else if (goal.name === "Learning") {
      this.expandLearn = !this.expandLearn;
    }
  }

  /**
   * Called when the previous navigation button is clicked
   */
  onClickPrevious() {
    this.navCtrl.pop({animate: false});
  }

  /**
   * Called when the previous navigation button is clicked
   */
  async onClickNext(exit=false) {
    let selectedConfigData = this.dataDetails.getSelectedConfigData(this.selectedGoals);
    this.configuredRoutine['goals'] = this.selectedGoals;
    this.configuredRoutine['selectedConfigData'] = selectedConfigData;
    if (exit) { // save and go back to the goal modification page
      this.navCtrl.setRoot(GoalModificationPage,
          {'configuredRoutine': this.configuredRoutine, 'params': this.params});
    } else { // continue with tracking data setup pages
      let configData = this.dataDetails.findNextConfigData(this.selectedGoals, null);
      if (configData !== null) {
        this.params['dataPage'] = configData;
        this.navCtrl.push(DataConfigPage,
            {'configuredRoutine': this.configuredRoutine, 'params': this.params}, {animate: false});
      } else {
        let error = new Error("All data conditional, no conditions met.");
        throw(error);
      }
    }
  }

  /**
   * Expand/collapse the text goal
   */
  toggleTextGoal() {
      this.textGoalExpand = !this.textGoalExpand;
  }

  /**
   * Called when the edit text field is focused
   */
  onEditTextGoalFocus() {
    this.displayTextGoalEditBtn = false;
  }

  /**
   * Called when the edit text field loses focus
   */
  onEditTextGoalBlur() {
    this.displayTextGoalEditBtn = true;
  }
}
