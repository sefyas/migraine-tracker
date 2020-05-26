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
  public workoutProgress : string = '0' + '%';
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
    this.selectedGoals = ['1a', '1b', '1c', '2a', '2b', '2c', '3'];
    let dataToSend = {'goalIDs': this.selectedGoals, 'textGoals': this.textGoals};
    if (exit) {
      dataToSend['goalsOnly'] = true;
      this.navCtrl.setRoot(GoalModificationPage, dataToSend);
    } else{
      let configData = this.dataDetails.findNextConfigData(this.selectedGoals, null);

      if (configData!== null) {
        dataToSend['dataPage'] = configData;
        this.navCtrl.push(DataConfigPage, dataToSend);
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
    this.navCtrl.pop();
  }

  onClickNext() {
    this.navCtrl.push(GoalTypePage);
  }

  // // see if there's still at least one subgoal selected for the goal; if not don't let them continue
  // _checkForSubgoals(goal : Goal){
  //   let subgoal = false;
  //   for(let i=0; i<goal.subgoals.length; i++){
  //     if(this.selectedGoals.indexOf(goal['goalID']) >-1){
  //       subgoal = true;
  //       break;
  //     }
  //   }
  //   if(!subgoal) this.goalsWithoutSubgoals.push(goal.goalID);
  // }



  // addGoal(goal : Goal, subgoal : Goal = null) {
  //   if (subgoal) {
  //     this.selectedGoals.push(subgoal.goalID);
  //     this._subgoalRequirementMet(goal['goalID']);
  //   } else {
  //     this.selectedGoals.push(goal['goalID']);
  //     if (goal['subgoals']) {
  //       this.goalsWithoutSubgoals.push(goal['goalID']);
  //     }
  //   }
  // }
  //

  //

  //
  // async continueSetup(exit=false) {
  //   let dataToSend = {'goalIDs': this.selectedGoals, 'textGoals': this.textGoals};
  //   if (exit) {
  //     dataToSend['goalsOnly'] = true;
  //     this.navCtrl.setRoot(GoalModificationPage, dataToSend);
  //   } else{
  //     let configData = this.dataDetails.findNextConfigData(this.selectedGoals, null);
  //
  //     if (configData!== null) {
  //       dataToSend['dataPage'] = configData;
  //       this.navCtrl.push(DataConfigPage, dataToSend);
  //     } else {
  //       let error = new Error("All data conditional, no conditions met.");
  //       throw(error);
  //     }
  //   }
  //   // this.couchDBService.addGoals(dataToSend["goalIDs"]);
  // }
  //
  // // if someone unselects a goal we need to unselect all the subgoals as well
  // _removeAllSubgoals(subgoals : Goal[]){
  //   for(let i=0; i<subgoals.length; i++){
  //     const index = this.selectedGoals.indexOf(subgoals[i].goalID);
  //     if(index > -1){
  //       this.selectedGoals.splice(index, 1);
  //     }
  //   }
  // }
  //
  // // see if there's still at least one subgoal selected for the goal; if not don't let them continue
  // _checkForSubgoals(goal : Goal){
  //   let subgoal = false;
  //   for(let i=0; i<goal.subgoals.length; i++){
  //     if(this.selectedGoals.indexOf(goal['goalID']) >-1){
  //       subgoal = true;
  //       break;
  //     }
  //   }
  //   if(!subgoal) this.goalsWithoutSubgoals.push(goal.goalID);
  // }
  //
  // // check if there's at least one subgoal selected for each main goal selected
  // _subgoalRequirementMet(goalID : string){
  //   const missingSubgoalIndex = this.goalsWithoutSubgoals.indexOf(goalID);
  //   if (missingSubgoalIndex > -1) { // if you now have a subgoal for all goals that need it, you can continue
  //     this.goalsWithoutSubgoals.splice(missingSubgoalIndex);
  //   }
  // }
  //
  // // Update percentage value where the above is a decimal
  // updateProgress(val) {
  //   this.workoutProgress = Math.min( (val * 100), 100) + '%';
  // }
  //
  //









}
