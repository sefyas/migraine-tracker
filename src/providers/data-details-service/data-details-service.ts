import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {DataElement, DataField, DataType, Goal} from "../../interfaces/customTypes";


@Injectable()
export class DataDetailsServiceProvider {
  private supportedFields : DataField[];
  private listedData : {[dataType: string] : DataElement[]};
  private configData : DataType[];
  private selectedConfigData : DataType[] = [];

  constructor(public http: HttpClient) {
    this._openListedData();
    this._openDataConfig();
    this._openSupportedFields();
  }

  _openDataConfig() {
    this.http.get<DataType[]>('assets/dataConfig.json', {},).subscribe(configData => {
        this.configData = configData;
      }, error => {
        console.log(error);
      });
  }

  _openSupportedFields() {
    this.http.get<DataField[]>('assets/supportedFields.json', {},).subscribe(fieldList => {
        this.supportedFields = fieldList;
        //console.log("supportedFields");
        //console.log(this.supportedFields);
      }, error => {
        console.log(error);
      });
  }

  _openListedData() {
    this.http.get<{[dataType: string] : DataElement[]}>('assets/listedData.json', {},).subscribe(listedData => {
        this.listedData = listedData;
        //console.log("listedData");
        //console.log(this.listedData);
      }, error => {
        console.log(error);
      });
  }


  getConfigByName(dataType: string) : DataType{
    for(let i=0; i<this.configData.length; i++){
      if(this.configData[i]['dataType'] === dataType){
        return this.configData[i];
      }
    }
    console.log("DATATYPE NOT IN DATA CONFIG: " + dataType);
    return null;
  }

  getAllDataTypes() : string[]{
    let allDataTypes = [];
    for(let i=0; i<this.configData.length; i++){
      allDataTypes.push(this.configData[i].dataType);
    }
    return allDataTypes;
  }

  getDataList(goals) : any[]{
    let dataList = [];
    for(let i=0; i<this.configData.length; i++){
      let condGoals = this.configData[i].conditionalGoals;
      if(condGoals){
        for(let j=0; j<condGoals.length; j++){
          let condGoal = condGoals[j];
          if(goals.indexOf(condGoal) > -1){
            dataList.push(this.configData[i].dataType);
            break;
          }
        }
      }
      else{
        dataList.push(this.configData[i].dataType);
      }
    }
    return dataList;
  }

  getSupportedFields() : DataField[] {
    return this.supportedFields;
  }


  getWhetherTrackingMeds(tracking: {[dataType:string]:DataElement[]}) : boolean {
    let typesToCheck = ["Treatment", "Change"];
    for (let i = 0; i < typesToCheck.length; i++) {
      let dataOfType = tracking[typesToCheck[i]];
      if(!dataOfType) continue;
      for (let j = 0; j < dataOfType.length; j++) {
        if (dataOfType[j].isMed) {
          return true;
        }
      }
    }
    return false;
  }


  getDisplayName(dataType : string) : string{
    for(let i=0; i<this.configData.length; i++){
      if(this.configData[i].dataType === dataType){
        if(this.configData[i].toDisplay){
          return this.configData[i].toDisplay;
        }
        else{
          return dataType;
        }
      }
    }
  }

  getWhetherRecommended(activeGoals: string[], recs: string[]){
    // based on the set of configured goals, returns whether we recommend a specific data element
    for(let i=0; i<activeGoals.length; i++){
      if(recs.indexOf(activeGoals[i]) > -1){
        return true;
      }
    }
    return false;
  }

  // load all config data based on the selected goals
  getSelectedConfigData(goalIDs : string[]) {
    this.selectedConfigData = [];
    for (let i=0; i<this.configData.length; i++) {
      let dataType = this.configData[i];
      if (!(dataType.conditionalGoals)) {
        this.selectedConfigData.push(dataType);
      } else {
        for (let j=0; j<dataType.conditionalGoals.length; j++) { // if it has ANY of the conditional goals, show the page
          if (goalIDs.indexOf(dataType.conditionalGoals[j]) > -1) {
            this.selectedConfigData.push(dataType);
            break;
          }
        }
      }
    }
    return this.selectedConfigData;
  }

  // find the next config data based on the selected goals and the current config data
  findNextConfigData(goalIDs : string[], currentlyConfiguring : DataType) {
    if (!currentlyConfiguring) {
      return this.selectedConfigData[0];
    } else {
      let newDataIndex = this.selectedConfigData.indexOf(currentlyConfiguring) + 1;
      if (newDataIndex < this.selectedConfigData.length) {
        return this.selectedConfigData[newDataIndex];
      } else {
        return null;
      }
    }
  }

  getWhetherIsMed(dataType: string, id: string) : boolean{
    // uses the listed data to find the original data type
    for (let i=0; i<this.listedData[dataType].length; i++) {
      if (this.listedData[dataType][i].id === id) {
        return this.listedData[dataType][i].isMed;
      }
      return null;
    }
  }


  getWhetherSelected(recommendedData, otherData, customData) {
    var selectedData = [];
    for (let i=0; i<recommendedData.length; i++) {
      if (recommendedData[i]["selected"]) {
        selectedData.push(recommendedData[i]);
      }
    }
    for (let i=0; i<otherData.length; i++) {
      if (otherData[i]["selected"]) {
        selectedData.push(otherData[i]);
      }
    }
    for (let i=0; i<customData.length; i++) {
      if (customData[i]["selected"]) {
        selectedData.push(customData[i]);
      }
    }
    return selectedData;
  }




  findDataByID(dataToTrack: DataElement[], id : string) : DataElement{
    // finds the data object in the list given the ID
    if(!dataToTrack) return null;
    for(let i=0; i<dataToTrack.length; i++){
      if(dataToTrack[i].id === id){
        return dataToTrack[i];
      }
    }
    return null;
  }




  getDataLists(alreadyTracking: {[dataType:string]:DataElement[]}, 
               dataType: string, // one of Symptom, Treatment, Contributor, Change, Other
               goalIDs: string[]
              ) : {[listInfo: string] : any}{
    let dataOfType : DataElement[] = this.listedData[dataType]; // list of behaviors that can be tracked under Symptom, Treatment, Contributor, Change, Other (e.g. Migraine, Peak Migraine Severity, ... in case of Symptom)
    let otherData : DataElement[] = [];
    let recData : DataElement[] = [];
    let alwaysQuickTrack : DataElement[] = [];
    let trackingMeds : boolean = this.getWhetherTrackingMeds(alreadyTracking);
    let expandOther: boolean = false;

    for(let i=0; i<dataOfType.length; i++){
      let dataObject = dataOfType[i]; // each behavior that can be tracked (e.g. Migraine or Peak Migraine Severity under Symptom)
      if (dataObject['alwaysQuickTrack']){
        dataObject['dataType'] = dataType;
        alwaysQuickTrack.push(dataObject);
      }
      let skip = false;
      let recommended = this.getWhetherRecommended(goalIDs, dataObject['recommendingGoals']);
      if(dataObject['condition']) {
        if(dataObject['id'] === 'frequentMedUse' || dataObject['id'] === 'whetherMedsWorked'){
          if(!trackingMeds){
            skip = true;
          }
        }
        else if(   dataObject['skipIfGoals'] 
                && dataObject['skipIfGoals'].filter(item => goalIDs.includes(item)).length > 0){
          // YSS NOTE skip only if behaviors related to goals under 'skipIfGoals' are selected.
          if(dataObject['skipIfBehaviors']){
            for(let category in dataObject['skipIfBehaviors']){
              //console.log('YSS DataDetailsServiceProvider - getDataLists: checking if', dataObject['skipIfBehaviors'][category], 'of', category, 'are tracked in', alreadyTracking);
              if(!alreadyTracking.hasOwnProperty(category)){
                console.log('YSS DataDetailsServiceProvider - getDataLists: no selection under', category, 'in', alreadyTracking, '; nothing to skip on off');
                continue;
              } else {
                let behaviors = dataObject['skipIfBehaviors'][category].find(config_item => alreadyTracking[category].find(selected_item => selected_item['id'] === config_item[0])? true: false);
                if(behaviors){
                  console.log('YSS DataDetailsServiceProvider - getDataLists: skipping', dataObject, 'because', behaviors, 'are tracked under', category);
                  skip = true;
                  break;
                } 
              }
            }
          } else {
            console.log('YSS DataDetailsServiceProvider - getDataLists: no behaviors are specified to skip on.');
          }
        } else{
          console.log("CONDITION BUT NO FUNCTION!");
        }
      }
      if(!skip){
        let trackingData = this.findDataByID(alreadyTracking[dataType], dataObject.id);
        if(recommended){
          if(trackingData) recData.push(trackingData);
          else recData.push(dataObject);
        }
        else{
          if(trackingData){
            otherData.push(trackingData);
            expandOther = true;
          }
          else otherData.push(dataObject);
        }
      }
    }

    return {'recData': recData, 'otherData':otherData, 'expandOther': expandOther, 'alwaysTrack': alwaysQuickTrack};


  }

}
