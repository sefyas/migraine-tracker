import { Injectable } from '@angular/core';
import {GoalDetailsServiceProvider} from "../goal-details-service/goal-details-service";
import {DataDetailsServiceProvider} from "../data-details-service/data-details-service";
import {DateFunctionServiceProvider} from "../date-function-service/date-function-service";


@Injectable()
export class GlobalFunctionsServiceProvider {


  private contactEmail = "lwjiang@cs.washington.edu or jesscs@cs.washington.edu";

  constructor(private goalDetails: GoalDetailsServiceProvider,
              private dataDetailsProvider: DataDetailsServiceProvider,
              private dateFuns: DateFunctionServiceProvider) {
  }


  getContactEmail(){
    return this.contactEmail;
  }


  getWhetherMigraine(symptomDict : {[symptom:string] : any}) : boolean{
    // todo: maybe have it be true/false/null?  Right now no indication means false in this
    if(symptomDict === undefined) return false;
    if('migraineToday' in symptomDict) return symptomDict['migraineToday'] === 'Yes';
    else if('peakMigraineSeverity' in symptomDict && Number(symptomDict['peakMigraineSeverity']) > 0){
      return true;
    }
    else if('migraineDuration' in symptomDict && Number(symptomDict['migraineDuration']) > 0){
      return true;
    }
    else if('migraineStartTime' in symptomDict || 'impactOnDisability' in symptomDict){
      return true;
    }
    return false;
  }



  getWhetherTrackedMeds(trackedDict: {[dataType:string] : any}) : boolean{
    let typesToCheck = ["Treatment", "Change"]; // kinda awful, should be in files or something.  Oh well...
    for(let i=0; i<typesToCheck.length; i++){
      let dataType = typesToCheck[i];
      if(trackedDict[dataType] === undefined) continue;
      let itemsTracked = Object.keys(trackedDict[dataType]);
      for(let j=0; j<itemsTracked.length; j++){
        if(this.dataDetailsProvider.getWhetherIsMed(dataType, itemsTracked[j])){
          let trackedVal = trackedDict[dataType][itemsTracked[j]];
          if(trackedVal === 'Yes'){
            return true;
          }
          if(Number(trackedVal) && Number(trackedVal) > 0){
            return true;
          }
        }
      }
    }
    return false;
  }

  getGoalHierarchy(currentGoalIDs : string[]) : {[goal:string] : string[]} {
    currentGoalIDs.sort();
    let goalHierarchy = {};
    for (let i=0; i<currentGoalIDs.length; i++) {
      let goalID = currentGoalIDs[i];
      let goalInfo = this.goalDetails.getGoalByID(goalID, false);
      if (goalInfo['isTopGoal']) { // it's not a subogal
        goalHierarchy[goalInfo.name] = {};
        goalHierarchy[goalInfo.name]['id'] = goalInfo.goalID;
        goalHierarchy[goalInfo.name]['effort'] = goalInfo.effort;
        goalHierarchy[goalInfo.name]['subgoals'] = [];
        let allGoalSubgoals = goalInfo['subgoals'] ? goalInfo['subgoals'] : [];
        for (let j=0; j<allGoalSubgoals.length; j++) {
          if (currentGoalIDs.indexOf(allGoalSubgoals[j].goalID) > -1) {
            goalHierarchy[goalInfo.name]['subgoals'].push(allGoalSubgoals[j].name)
          }
        }
      }
    }
    return goalHierarchy;
  }

  /**
   * Calculate prior progress for the data with a set goal
   * @param data
   * @param dataType
   * @param previouslyTracked
   * @param timespan
   */
  calculatePriorGoalProgress(data : {[dataConfigDetails: string] : any},
                             dataType : string,
                             previouslyTracked : {[dataType:string] : any}[],
                             timespan : string=undefined) {
    let timesTracked;
    if (!timespan) {
      timespan = data.goal.timespan;
    }
    let cutoff; 
    if (timespan.toLowerCase() === "day") {
      cutoff = this.dateFuns.dateArithmatic(new Date(), 'subtract', 1, 'day');
    } else if (timespan.toLowerCase() === "week") {
      cutoff = this.dateFuns.dateArithmatic(new Date(), 'subtract', 1, 'week');
    } else if (timespan.toLowerCase() === "month") {
      cutoff = this.dateFuns.dateArithmatic(new Date(), 'subtract', 1, 'month');
    } else {
      console.log('YSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: Warning - can only process month, week, or day timespans')
      return timesTracked;
    }
    timesTracked = 0;
    //console.log('YSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: data', data, 'dataType', dataType, 'previouslyTracked', previouslyTracked, 'cutoff', cutoff);
    for (let i = 0; i < previouslyTracked.length; i++) {
      //console.log('\tYSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: considering value', previouslyTracked[i][1], 'of type', previouslyTracked[i][0], 'on', previouslyTracked[i][2].toISOString());
      if (previouslyTracked[i][2] > cutoff) {
        //console.log('\t\tYSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: passed cutoff');
        if (previouslyTracked[i][1][dataType] && previouslyTracked[i][1][dataType][data.id]) {
          if(previouslyTracked[i][0][dataType] && previouslyTracked[i][0][dataType][data.id]){
            let field = previouslyTracked[i][1][dataType][data.id];
            let value = previouslyTracked[i][0][dataType][data.id];
            value = (field === 'number') ? Number(value) : ((value === 'Yes') ? 1 : 0);
            timesTracked += value;
            //console.log('\t\t\tYSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: incrementing by', value, 'to', timesTracked);
          } else {
            console.log('YSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: Error - data does not exist despite specified field for', data['id'], 'on', previouslyTracked[i][2].toISOString().substring(0,10));
          }
        }
      }
    }
    //console.log('YSS GlobalFunctionsServiceProvider - calculatePriorGoalProgress: returning timesTracked for', data['id'], 'of', dataType, ':', timesTracked);
    return timesTracked;
  }
}
