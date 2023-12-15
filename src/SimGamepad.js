
import React, { Component } from 'react';
// import classNames from 'classnames'
import {
  CButton,
  CRow,
  CCol,
  CCard,
  CCardBody,
} from '@coreui/react'
import ROSLIB from 'roslib';
import SimJoystick from './SimJoystick';

class SimGamepad extends Component {

  constructor(props) {
    super(props);
    this.controllers = {};
    this.state = {
      buttons: [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      buttonNames: ["Color Cam", "Fisheye Cam", "Disable Cams", "Enable Joy", "Go to Dock", "Cancel Action", "Undock", "Find yourself", "Retract Probe", "Start Vacuum", "Start Coverage", "Stop Coverage", "Startup", "Poweroff"],
      axes: [0,0],
      sticks: [0],
      joyEnabled: false,
      videoId: 0,
      joyLastSeen: 0,  // If joy inactive for >this.joyTimeout ms, turn publishing off
      batteryLevel: 100,
      loggingText: "\n\n\n\n\n",
      loggingList: [],
      vacuumEnabled: false,
      probeExtended: true,
    };
    this.joyTimeout = 2000;
    this.pubTimerMs = 40;
    this.refreshCamTimerMs = 2000;
    this.ros = new ROSLIB.Ros();
  }

  componentDidMount() {

    // If there is an error on the backend, an 'error' emit will be emitted.
    this.ros.on('error', function (error) {
      console.log(error);
    });

    // Find out exactly when we made a connection.
    this.ros.on('connection', function () {
      console.log('Connection made!');
    });

    this.ros.on('close', function () {
      console.log('Connection closed.');
    });

    this.ros.connect(this.props.rosbridgeAddress);

    this.joy_topic = new ROSLIB.Topic({
      ros: this.ros,
      name: '/joy',
      messageType: 'sensor_msgs/Joy'
    });

    var battery_level_listener = new ROSLIB.Topic({
      ros : this.ros,
      name : '/battery_level',
      messageType : 'sensor_msgs/BatteryState'
    });

    var pippino_log_listener = new ROSLIB.Topic({
      ros : this.ros,
      name: '/pippino_ui_log',
      messageType : 'std_msgs/String'
    });

    // Services

    this.pippino_video_stream_client = new ROSLIB.Service({
      ros : this.ros,
      name: '/pippino_video_stream',
      serviceType: 'pippino_service_msg/srv/PippinoVideoStream'
    });

    this.pippino_autodock_actions_client = new ROSLIB.Service({
      ros : this.ros,
      name: '/pippino_autodock_actions',
      serviceType: 'pippino_service_msg/srv/PippinoAutodockActions'
    });

    this.pippino_coverage_actions_client = new ROSLIB.Service({
      ros : this.ros,
      name: '/pippino_coverage_actions',
      serviceType: 'pippino_service_msg/srv/PippinoCoverageActions'
    });

    this.pippino_actuators_client = new ROSLIB.Service({
      ros : this.ros,
      name: '/pippino_actuators',
      serviceType: 'pippino_service_msg/srv/PippinoActuators'
    });

    this.pippino_discovery_client = new ROSLIB.Service({
      ros: this.ros,
      name: '/pippino_discover_actions',
      serviceType: 'pippino_service_msg/srv/PippinoDiscoverActions'
    })

    battery_level_listener.subscribe(this.updateBatteryValue);
    pippino_log_listener.subscribe(this.updateLogFromMsg);

    setInterval(this.pubTimerEnd, this.pubTimerMs);
    setInterval(this.refreshCam, this.refreshCamTimerMs);
  }

  updateLogFromMsg = (message) => {
    // console.log('Received message: ' + message.data);
    // console.log(this)
    if (this.state.loggingList.push(message.data) > 5)
      this.state.loggingList.shift();
    this.setState({ loggingText: this.state.loggingList.join('\n') })
  }

  updateBatteryValue = (message) => {
    // console.log('Received message on ' + this.battery_level_listener.name + ': ' + message.percentage);
    this.setState({ batteryLevel: message.percentage.toFixed(0) });
  }

  componentWillUnmount () {
    this.ros.close();
  }

  updateLogFromTxt (data) {
    if (this.state.loggingList.push("System: " + data) > 5)
      this.state.loggingList.shift();
    this.setState({ loggingText: this.state.loggingList.join('\n') })
  }

  stopPippino () {
    console.log('stopping');
  }

  startupPippino () {
    fetch('http://192.168.0.28:8123/api/events/pippino_on', {
      method: "POST",
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI0ZWRhZDFmMzdlZjY0ZTRiYWJjNGY0MGVmOTIyMTYyNiIsImlhdCI6MTcwMjQwODk1MiwiZXhwIjoyMDE3NzY4OTUyfQ.UFIY_zhbUBoZBHO3d1rqYRn-r13ukPN9BsH_Qvb1zMY' }
      }).then(function (response) {
      if (!response.ok) {
        return Promise.reject(response);
      }
      // console.log(response)
      return response.json();
    }).then(data => {
      this.updateLogFromTxt(data.message);
    });
  }

  enableJoy () {
    var buttonNames = this.state.buttonNames
    buttonNames[3] = "Disable Joy";
    this.setState({ joyEnabled: true, buttonNames: buttonNames})
  }

  disableJoy () {
    var buttonNames = this.state.buttonNames
    buttonNames[3] = "Enable Joy";
    this.setState({ joyEnabled: false, buttonNames: buttonNames })
  }

  extendProbe() {
    return new Promise((resolve, reject) => {
      console.log("calling the service to extend probe");
      var request = new ROSLIB.ServiceRequest({ request_type: 0, power_probe_joint_position: 180 });
      this.pippino_actuators_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for service call on pippino_actuators: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("PippinoActuators err:", err);
          reject(err);
        }
      );
    });
  }

  retractProbe() {
    return new Promise((resolve, reject) => {
      console.log("calling the service to retract probe");
      var request = new ROSLIB.ServiceRequest({ request_type: 0, power_probe_joint_position: 0 });
      this.pippino_actuators_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for service call on pippino_actuators: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("PippinoActuators err:", err);
          reject(err);
        }
      );
    });
  }


  disableVacuum () {
    return new Promise((resolve, reject) => {
      // console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({request_type: 1, bool_vacuum_enable: false});
      this.pippino_actuators_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for service call on pippino_actuators: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("PippinoActuators err:", err);
          reject(err);
        }
      );
    });
  }

  enableVacuum () {
    return new Promise((resolve, reject) => {
      console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({request_type: 1, bool_vacuum_enable: true});
      this.pippino_actuators_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for service call on pippino_actuators: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("PippinoActuators err:", err);
          reject(err);
        }
      );
    });
  }

  enableD455() {
    return new Promise((resolve, reject) => {
      console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({ request_type: 4, d455_enable: true, d455_hires: false, t265_enable: false });
      this.pippino_video_stream_client.callService(request, response => { var success = response.success; resolve(success); }, err => { reject(err); });
    });
  }

  enableT265() {
    return new Promise((resolve, reject) => {
      console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({ request_type: 3, d455_enable: false, t265_enable: true });
      this.pippino_video_stream_client.callService(request, response => { var success = response.success; resolve(success); }, err => { reject(err); });
    });
  }

  disableCams() {
    return new Promise((resolve, reject) => {
      console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({ request_type: 3, d455_enable: false, t265_enable: false });
      this.pippino_video_stream_client.callService(request, response => { var success = response.success; resolve(success); }, err => { reject(err); });
    });
  }

  cancelDocking() {
    return new Promise((resolve, reject) => {
      console.log("canceling the docking service");
      var request = new ROSLIB.ServiceRequest({ action_type: 0 });
      this.pippino_autodock_actions_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for cancel service call on docking server: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Docking err:", err);
          reject(err);
        }
      );
    });
  }

  goToDock() {
    return new Promise((resolve, reject) => {
      console.log("start docking service");
      var request = new ROSLIB.ServiceRequest({ action_type: 1 });
      this.pippino_autodock_actions_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for docking service call on docking server: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Docking err:", err);
          reject(err);
        }
      );
    });
  }

  startCoverage() {
    return new Promise((resolve, reject) => {
      console.log("start coverage service");
      var request = new ROSLIB.ServiceRequest({ action_type: 1 });
      this.pippino_coverage_actions_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for coverage service call on coverage service: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Coverage err:", err);
          reject(err);
        }
      );
    });
  }

  cancelCoverage() {
    return new Promise((resolve, reject) => {
      console.log("cancel coverage service");
      var request = new ROSLIB.ServiceRequest({ action_type: 0 });
      this.pippino_coverage_actions_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for coverage service call on coverage service: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Coverage err:", err);
          reject(err);
        }
      );
    });
  }



  detachFromDock() {
    return new Promise((resolve, reject) => {
      console.log("start detach from dock service");
      var request = new ROSLIB.ServiceRequest({ action_type: 2 });
      this.pippino_autodock_actions_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for detach from dock service call on docking server: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Docking err:", err);
          reject(err);
        }
      );
    });
  }

  cancelDiscovery() {
    return new Promise((resolve, reject) => {
      console.log("canceling the discovery service");
      var request = new ROSLIB.ServiceRequest({ action_type: 0 });
      this.pippino_discovery_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for cancel service call on discovery server: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Discovery err:", err);
          reject(err);
        }
      );
    });
  }

  findYourself() {
    return new Promise((resolve, reject) => {
      console.log("calling the discovery service to find aruco");
      var request = new ROSLIB.ServiceRequest({ action_type: 1 });
      this.pippino_discovery_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for find yourself service call on discovery server: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Discovery err:", err);
          reject(err);
        }
      );
    });
  }

  mapTheRoom() {
    return new Promise((resolve, reject) => {
      console.log("calling the discovery service to map the room");
      var request = new ROSLIB.ServiceRequest({ action_type: 2, map_url: "/home/michele/maps/map231023" });
      this.pippino_discovery_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for mapping service call on discovery server: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("Discovery err:", err);
          reject(err);
        }
      );
    });
  }


  refreshCam = () => {
    var video_id = this.state.videoId + 1
    this.setState({ videoId: video_id });
    this.props.updateVideoSize(this.state.videoId);
  }

  pubTimerEnd = () => {
    this.publishJoy()
  }

  publishJoy = (force = false) => {
    if (this.state.joyEnabled || force){
      var joyMsg = new ROSLIB.Message({
        header:
        {
          // seq: 0,
          stamp: [0,0],
          frame_id: ""
        },
        axes: [],
        buttons: []
      });

      joyMsg.axes = this.state.axes;
      // joyMsg.buttons = this.state.buttons.slice(0, 8);
      var joy_last_seen = this.state.joyLastSeen + this.pubTimerMs;
      this.setState({ joyLastSeen: joy_last_seen });
      if(this.state.joyLastSeen<this.joyTimeout || force){
        this.joy_topic.publish(joyMsg);
      }
    }
  }

  buttonOn = (index) =>{
    this.setState( { joyLastSeen: 0 } );
    var buttonVals = this.state.buttons;
    buttonVals[index] = 1;
    switch (index) {
      case 0:
        this.enableD455();
        break;
      case 1:
        this.enableT265();
        break;
      case 2:
        this.disableCams();
        this.joyStop();
        this.publishJoy(true);
        this.disableJoy();
        break;
      case 3:
        console.log("this.state.joyEnabled=" + this.state.joyEnabled);
        if (this.state.joyEnabled){
          this.joyStop();
          this.publishJoy(true);
          this.disableJoy();
        }else{
          this.enableJoy();
        }
        break;
      case 4:
        this.goToDock();
        break;
      case 5:
        this.cancelDocking();
        this.cancelDiscovery();
        break;
      case 6:
        this.detachFromDock();
        break;
      case 7:
        this.findYourself();
        break;
      case 8:
        if (this.state.probeExtended) {
          const vacuumPromise = this.retractProbe();
          vacuumPromise.then(function (success) {
            if (success) {
              console.log("its success 1");
              var buttonNames = this.state.buttonNames;
              buttonNames[8] = "Extend Probe";
              this.setState({ buttonNames: buttonNames, probeExtended: false });
            }
          }.bind(this))
        } else {
          const vacuumPromise = this.extendProbe();
          vacuumPromise.then(function (success) {
            if (success) {
              console.log("its success 2");
              var buttonNames = this.state.buttonNames;
              buttonNames[8] = "Retract Probe";
              this.setState({ buttonNames: buttonNames, probeExtended: true });
            }
          }.bind(this))
        }
        break;
      case 9:
        if (this.state.vacuumEnabled) {
          const vacuumPromise = this.disableVacuum();
          vacuumPromise.then(function (success) {
            if (success) {
              // console.log("its success 1");
              var buttonNames = this.state.buttonNames;
              buttonNames[9] = "Start Vacuum";
              this.setState({ buttonNames: buttonNames, vacuumEnabled: false });
            }
          }.bind(this))
        } else {
          const vacuumPromise = this.enableVacuum();
          vacuumPromise.then(function (success) {
            if (success) {
              // console.log("its success 2");
              var buttonNames = this.state.buttonNames;
              buttonNames[9] = "Stop Vacuum";
              this.setState({ buttonNames: buttonNames, vacuumEnabled: true });
            }
          }.bind(this))
        }
        break;
      case 10:
        this.startCoverage()
        break;
      case 11:
        this.cancelCoverage()
        break;
      case 12:
        this.startupPippino()
        break;
      case 13:
        this.stopPippino()
        break;
      default:
        break;
    }
    if (index === 0 || index === 1 || index === 4 || index === 5 || index === 6 || index === 7) {
      this.enableJoy();
      this.publishJoy(true);
    }
    this.setState({ buttons: buttonVals});
  }

  buttonOff = (index) =>{
    var buttonVals = this.state.buttons;
    buttonVals[index] = 0;
    this.setState({ buttons: buttonVals, joyLastSeen: 0 });
    if (index === 4){
      this.publishJoy(true);
      this.disableJoy();
    }
  }

  joyStop = (index) =>{
    var axisVals =  this.state.axes;
    axisVals[2*index] = 0;
    axisVals[2*index+1] = 0;
    this.setState({ axes: axisVals });
    console.log("stopping joy");
    this.publishJoy(true);
  }

  joyMove = (x, y, index) =>{
    var axisVals =  this.state.axes;
    x*=100;
    y*=100;
    axisVals[2*index+1] = y;
    if (y>0){
      axisVals[2*index] = x;
    }else{
      axisVals[2*index] = -x/1.6;
    }
    this.setState({ axes: axisVals, joyLastSeen: 0 });
  }

  render() {

    const vars = {
      '--cui-gutter-y': '3px',
      '--cui-gutter-x': '3px',
      '--cui-btn-padding-x': '5px',
      '--cui-btn-padding-y': '0px'
    }
    let buttons = this.state.buttons.map((item, index) => <CCol style={vars} key={index} className="mb-xs-0 d-grid gap-2">
      <CButton style={vars} className="button-fixed-height" size="sm" block="true" color={item > 0 ? "primary" : "secondary"} onPointerDown={() => this.buttonOn(index)} onPointerUp={() => this.buttonOff(index)} >{this.state.buttonNames[index]}</CButton>
    </CCol>);

    let stickDisplays = this.state.sticks.map((item, index) => <CCol key={index} xl style={{ display: "flex", width: "80%", justifyContent: "center" }} className="mb-3 mb-xl-0">
      <SimJoystick size={80} move={(x,y) => this.joyMove(x,y, index)} stop={() => this.joyStop(index)} />
    </CCol>);

    let battery_status_col = <CCol style={{ width: "10%", display: "flex", justifyContent: "right" }}>Battery Level: {this.state.batteryLevel}%</CCol>;

    let service_req_status_col = <CCol style={{ width: "100%", display: 'flex', justifyContent: 'left', whiteSpace: 'pre-line', textAlign: 'justify', borderStyle: 'solid', borderWidth: '1px', borderColor: 'gray', borderRadius: '10px', marginTop: '4px', fontSize: 'small'}}>{this.state.loggingText}</CCol>

    // let axisDisplays = this.state.axes.map((item, index) => <CCol key={index} col="6" sm="4" md="2" xl className="mb-3 mb-xl-0">
    //   <AxisBar value={item}/>
    // </CCol>);

    return (
      <CCard style={{ width: "100%", borderWidth: "0px"}}>
        <CCardBody>
          <CRow className="align-items-center mb-3 joystick-row" style={{ width: "100%"}}>
            <CCol style={{ width: "10%", display: "flex", justifyContent: "left" }}></CCol>{stickDisplays}{battery_status_col}
          </CRow>
          <CRow className="align-items-center" md={{ cols: "auto", gutter: "auto" }} sm={{ cols: 3, gutter: 2 }} xs={{ cols: 4, gutter: 2 }}>
            {buttons}
          </CRow>
          <CRow>
            {service_req_status_col}
          </CRow>
        </CCardBody>
      </CCard>

    );
  }
}

export { SimGamepad };