import { Component } from '@angular/core';
import {NavController, NavParams} from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {GoalTypePage} from "../addGoal/goal-type/goal-type";
import {GlobalFunctionsServiceProvider} from "../../providers/global-functions-service/global-functions-service";

@Component({
  selector: 'page-goal-modification',
  templateUrl: 'goal-modification.html',
})
export class GoalModificationPage {
  private goalTypes : string[];
  private goalHierarchy : {[goal: string] : string[]};
  private textGoals : string;
  private configuredRoutine : any = {};

  constructor(public navCtrl: NavController, public navParams: NavParams,
              public couchDBService: CouchDbServiceProvider,
              public globalFunctionsService: GlobalFunctionsServiceProvider) {
  }

  async ionViewDidLoad() {
    // arrive here from goal/tracking routine modification page
    if (this.navParams.data && this.navParams.data.params && this.navParams.data.params['modifyGoal']) {
      this.configuredRoutine = this.navParams.data.configuredRoutine;
      this.couchDBService.logConfiguredRoutine(this.configuredRoutine);
    } else {
      this.configuredRoutine = await this.couchDBService.fetchConfiguredRoutine();
    }
    this.textGoals = this.configuredRoutine['textGoals'];
    this.goalHierarchy = this.globalFunctionsService.getGoalHierarchy(this.configuredRoutine['goals']);
    this.goalTypes = Object.keys(this.goalHierarchy);
  }

  /**
   * Edit goals
   */
  editGoal() {
    let params = {'modifyGoal': true};
    this.navCtrl.push(GoalTypePage,
        {'configuredRoutine': this.configuredRoutine, 'params': params}, {animate: false});
  }
}
