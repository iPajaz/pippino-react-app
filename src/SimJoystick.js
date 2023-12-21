
import React, { Component } from 'react';
import { Joystick } from 'react-joystick-component';

class SimJoystick extends Component {
  move = (event) =>
  {
      this.props.move(event.x/this.props.size, event.y/this.props.size);
  }

  stop = () =>
  {
      this.props.stop();
  }

  render() {

    return (
      <Joystick size={this.props.size*2} baseColor="CornflowerBlue"
      stickColor="blue" move={this.move} stop={this.stop} ></Joystick>

    );
  }
}

  export default SimJoystick;