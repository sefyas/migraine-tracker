import { Component } from '@angular/core';
import {ModalController, NavController, NavParams} from 'ionic-angular';
import {CouchDbServiceProvider} from "../../providers/couch-db-service/couch-db-service";
import {DataDetailsServiceProvider} from "../../providers/data-details-service/data-details-service";
import {DataConfigPage} from "../addGoal/data-config/data-config";
import {SelectTrackingFrequencyPage} from "../addGoal/select-tracking-frequency/select-tracking-frequency";
import {GlobalFunctionsServiceProvider} from "../../providers/global-functions-service/global-functions-service";
import {DateFunctionServiceProvider} from "../../providers/date-function-service/date-function-service";
import {DataElement, Notification} from "../../interfaces/customTypes";


@Component({
  selector: 'page-tracking-modification',
  templateUrl: 'tracking-modification.html',
})

export class TrackingModificationPage {
  private configuredRoutine : any = {};
  private goals : string[];
  private notifications : {[notificationType: string] : Notification} = {};
  private currentData : {[dataType: string] : DataElement[]} = {};


  private allDataTypes : string[] = [];
  // private displayNames : {[dataType: string] : string} = {};
  private timeToDisplay : string;


  constructor(public navCtrl: NavController, public navParams: NavParams,
              private couchDBService: CouchDbServiceProvider,
              private dataDetailsService: DataDetailsServiceProvider,
              private modalCtrl: ModalController,
              private globalFuns: GlobalFunctionsServiceProvider,
              private dateFuns: DateFunctionServiceProvider) {
  }

  async ionViewDidLoad() {
    this.configuredRoutine = await this.couchDBService.fetchConfiguredRoutine();
    this.goals = this.configuredRoutine['goals'];
    this.notifications = this.configuredRoutine['notifications'];
    this.currentData = this.configuredRoutine['dataToTrack'];

    if (this.notifications['regular'] && this.notifications['regular']['timeOfDay']) {
      this.timeToDisplay = this.dateFuns.timeTo12Hour(this.notifications['regular']['timeOfDay']);
    }
    this.allDataTypes = this.dataDetailsService.getDataList(this.configuredRoutine['goals']);
    // for (let i=0; i<this.allDataTypes.length; i++) {
    //   this.displayNames[this.allDataTypes[i]] = this.dataDetailsService.getDisplayName(this.allDataTypes[i]);
    // }

    console.log("configuredRoutine ~~~~~~~~");
    console.log(this.configuredRoutine);

    console.log("goals ~~~~~~~~");
    console.log(this.goals);

    console.log("notifications ~~~~~~~~");
    console.log(this.notifications);

    console.log("currentData ~~~~~~~~");
    console.log(this.currentData);

    console.log("allDataTypes ~~~~~~~~");
    console.log(this.allDataTypes);

    // console.log("displayNames ~~~~~~~~");
    // console.log(this.displayNames);

    console.log("timeToDisplay ~~~~~~~~");
    console.log(this.timeToDisplay);

  }

  // changeFreq() {
  //   let changeFreqModal = this.modalCtrl.create(SelectTrackingFrequencyPage,
  //     {'isModal': true});
  //   let actualThis = this;
  //   changeFreqModal.onDidDismiss(newData => {
  //     if(newData){ // todo: notifications
  //       actualThis.notifications = newData;
  //       this.couchDBService.modifyFrequency(newData);
  //       if(actualThis.notifications['regular'] && actualThis.notifications['regular']['timeOfDay']){
  //         actualThis.timeToDisplay = actualThis.dateFuns.timeTo12Hour(actualThis.notifications['regular']['timeOfDay']);
  //       }
  //
  //     }
  //   });
  //
  //   changeFreqModal.present();
  // }
  //
  //
  // modifyDatatypeRoutine(dataType : string){
  //   let data = {'dataType': dataType, 'dataDesc': 'Add ' + dataType + ' Data'};
  //   let addDataModal = this.modalCtrl.create(DataConfigPage, data);
  //
  //   addDataModal.onDidDismiss(newData => {
  //     console.log(newData);
  //     this.currentData[dataType] = newData['selected'];
  //     if(newData['quickTrackers']) this.couchDBService.modifyQuickTrackers(newData['quickTrackers']);
  //     this.couchDBService.modifyTrackingRoutine(dataType, newData['selected']);
  //   });
  //
  //   addDataModal.present();
  // }


}
