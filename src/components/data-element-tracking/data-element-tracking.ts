import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DateFunctionServiceProvider} from "../../providers/date-function-service/date-function-service";


@Component({
  selector: 'data-element-tracking',
  templateUrl: 'data-element-tracking.html'
})

export class DataElementTrackingComponent {
  @Input() data: { [dataProps: string]: any };
  @Input() dataVal: any = null;
  @Input() dataStart: any = null;
  @Input() dataEnd: any = null;
  @Input() trackedMedsToday: boolean;
  @Output() valueChanged: EventEmitter<{ [dataVals: string]: any }> = new EventEmitter<{ [dataVals: string]: any }>();

  constructor(private dateFuns: DateFunctionServiceProvider) {
  }

  ngOnInit() {
    if (this.dataVal) {
      if (this.data.field === 'time') {
        this.dataVal = this.dateFuns.getISOTime(this.dataVal);
      }
    }
    this.formatTime();
  }

  formatTime() {
    if (this.dataStart) {
      this.dataStart = this.dateFuns.getISOTime(this.dataStart);
    }
    if (this.dataEnd) {
      this.dataEnd = this.dateFuns.getISOTime(this.dataEnd);
    }
  }

  itemTracked(event, type) {
    if (type === 'val') {
      this.valueChanged.emit({dataVal: event, dataStart: null, dataEnd: null})
    } else if (type === 'start') {
      this.valueChanged.emit({dataVal: null, dataStart: event, dataEnd: null})
    } else {
      this.valueChanged.emit({dataVal: null, dataStart: null, dataEnd: event})
    }
  }
}
