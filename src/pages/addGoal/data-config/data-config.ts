import { Component } from '@angular/core';
import { ModalController, NavController, NavParams, ViewController } from 'ionic-angular';
import { DataDetailsServiceProvider } from "../../../providers/data-details-service/data-details-service";
import { SelectTrackingFrequencyPage } from "../select-tracking-frequency/select-tracking-frequency";
import { EditDataPage } from "../edit-data/edit-data";
import * as moment from 'moment';
import { GoalModificationPage } from "../../goal-modification/goal-modification";
import { TrackingModificationPage } from "../../tracking-modification/tracking-modification";
import { DataElement, DataType } from "../../../interfaces/customTypes";

@Component({
  selector: 'page-data-config',
  templateUrl: 'data-config.html',
})
export class DataConfigPage {
  configuredRoutine : any = {};
  params : any = {};
  allGoals : string[] = [];
  dataObject : DataType;
  modifyGoal : boolean = false;
  modifyData : boolean = false;
  startDate : any = null;
  private workoutProgress : string = '0' + '%';
  private selectedConfigData : string[];
  private today = moment().toISOString();
  private nextYear = moment().add(1, "year").toISOString();
  private customData : DataElement[]= [];
  private recommendedData : DataElement[]= [];
  private otherData : DataElement[] = [];
  private recommendExpanded : boolean = true;
  private commonExpanded : boolean = false;

  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              public viewCtrl: ViewController,
              public dataDetailsServiceProvider: DataDetailsServiceProvider,
              public modalCtrl: ModalController) {
    this.configuredRoutine = this.navParams.data.configuredRoutine;
    this.params = this.navParams.data.params;

    this.allGoals = this.configuredRoutine['goals'] ? this.configuredRoutine['goals'] : [];
    this.selectedConfigData = this.configuredRoutine['selectedConfigData'];
    this.dataObject = this.params['dataPage'];
    this.modifyGoal = this.params['modifyGoal'];
    this.modifyData = this.params['modifyData'];
    this.getDataInfo(this.configuredRoutine['dataToTrack']);

    if (this.modifyGoal) {
      this.workoutProgress = Math.min( ( (this.selectedConfigData.indexOf(this.params['dataPage']) + 1)
          / this.selectedConfigData.length * 100), 100).toString() + '%';
    } else if (!this.modifyData) {
      this.workoutProgress = "100%";
    } else {
        this.workoutProgress = Math.min( ( (this.selectedConfigData.indexOf(this.params['dataPage']) + 1)
            / (this.selectedConfigData.length + 1) * 100), 100).toString() + '%'
    }
    this.startDate = this.dataObject.startDate ? new Date().toISOString() : null;
  }

  async ionViewDidLoad() {

  }

  /**
   * Expand/collapse the recommend data card
   */
  toggleRecommendCard() {
    this.recommendExpanded = !this.recommendExpanded;
  }

  /**
   * Expand/collapse the common data card
   */
  toggleCommonCard() {
    this.commonExpanded = !this.commonExpanded;
  }

  /**
   * Called when the previous navigation button is clicked
   */
  onClickPrevious() {
    this.navCtrl.pop({animate: false});
  }

  /**
   * Called when the next navigation button is clicked
   */
  onClickNext() {
    let selectedData : DataElement[] = this.dataDetailsServiceProvider.getWhetherSelected(
        this.recommendedData, this.otherData, this.customData);

    if (this.configuredRoutine['goals']) {
      if (selectedData.length > 0) { // set selected data
        if (!this.configuredRoutine['dataToTrack']) { // if there is no data selected yet, create a new dictionary
          this.configuredRoutine['dataToTrack'] = {};
        }
        if (this.startDate) { // set start date for each data selected
          for (let i=0; i< selectedData.length; i++) {
            selectedData[i]['startDate'] = this.startDate;
          }
        }
        this.configuredRoutine['dataToTrack'][this.dataObject['dataType']] = selectedData;
      }
      let nextConfigData = this.dataDetailsServiceProvider.findNextConfigData(
          this.configuredRoutine['goals'], this.dataObject);
      if (this.modifyData) { // more data configure to do
        this.navCtrl.setRoot(TrackingModificationPage,
            {'configuredRoutine': this.configuredRoutine, 'params': this.params}, {animate: false});
      } else {
        if (nextConfigData !== null) { // modify a single data
          this.params['dataPage'] = nextConfigData;
          this.navCtrl.push(DataConfigPage,
              {'configuredRoutine': this.configuredRoutine, 'params': this.params}, {animate: false});
        } else if (nextConfigData === null && !this.modifyGoal) { // no more data to configure during init setup
          this.navCtrl.push(SelectTrackingFrequencyPage,
              {'configuredRoutine': this.configuredRoutine, 'params': this.params}, {animate: false});
        } else if (nextConfigData === null && this.modifyGoal) { // no more data to configure during modification
          this.navCtrl.setRoot(GoalModificationPage,
              {'configuredRoutine': this.configuredRoutine, 'params': this.params}, {animate: false});
        }
      }
    } else {
      this.viewCtrl.dismiss({'selected': selectedData});
    }
  }

  /**
   * Get all data info
   * @param alreadyTracking
   */
  getDataInfo(alreadyTracking : {[dataType:string]:DataElement[]}) {
    let dataInfo = this.dataDetailsServiceProvider.getDataLists(
        alreadyTracking, this.dataObject['dataType'], this.allGoals);
    this.recommendedData = dataInfo['recData'];
    this.otherData = dataInfo['otherData'];
    this.commonExpanded = dataInfo['expandOther'];
    this.loadCustomData(alreadyTracking[this.dataObject['dataType']]);
  }

  /**
   * Put everything already being tracked into their correct lists so we can modify them accurately
   * @param trackingOfDatatype
   */
  loadCustomData(trackingOfDatatype : DataElement[]) {
    if (trackingOfDatatype) {
      for (let i=0; i<trackingOfDatatype.length; i++) {
        if (trackingOfDatatype[i].custom) {
          this.customData.push(trackingOfDatatype[i]);
        }
      }
    }
  }

  /**
   * Replace the old data with a new data
   * @param list
   * @param oldData
   * @param newData
   */
  replaceData(list : DataElement[], oldData : DataElement, newData : DataElement) {
    let oldIndex = list.indexOf(oldData);
    if (oldIndex > -1) {
      list.splice(oldIndex, 1, newData);
    } else {
      list.push(newData);
    }
  }

  /**
   * Remove a selected data
   * @param data
   * @param category
   */
  removeData(data : DataElement, category : string) {
    if (category === "custom") {
      this.customData.splice(this.customData.indexOf(data), 1);
    } else {
      data.selected = false;
    }
  }

  /**
   * Edit data settings
   * @param oldData
   * @param type
   */
  editData(oldData : DataElement, type : string) {
    let oldDataCopy = Object.assign({}, oldData);
    if (oldData.goal) {
      oldDataCopy.goal = Object.assign({}, oldData.goal);
    }
    if (oldData.suggestedGoal) {
      oldDataCopy.suggestedGoal = Object.assign({}, oldData.suggestedGoal);
    }

    let dataToSend = {'data': oldDataCopy,
      'dataType': this.dataObject['dataType'],
      'selectedGoals': this.allGoals,
      'allowsDataGoals': this.dataObject['dataGoals'],
      'modifying': this.params['modifyGoal'] || this.params['modifyData']};

    let editDataModal = this.modalCtrl.create(EditDataPage, dataToSend,
        {showBackdrop: true, cssClass: 'modal-fullscreen'});

    editDataModal.onDidDismiss(newData => {
      if (newData) {
        if (newData === 'remove') {
          this.removeData(oldData, type);
        } else {
          newData.selected = true;
          if (type === "custom") {
            this.replaceData(this.customData, oldData, newData);
          } else if (type === 'rec') {
            this.replaceData(this.recommendedData, oldData, newData);
          } else if (type === 'other') {
            this.replaceData(this.otherData, oldData, newData);
          }
        }
      }
    });
    editDataModal.present();
  }
}
