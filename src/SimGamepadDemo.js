import { SimGamepad } from './SimGamepad';
import { ImageStream } from './ImageStream';
import './App.css';
import './scss/style.scss';
import { useState } from 'react';


function SimGamepadDemo() {
  const [videoId, setVideoId] = useState('')
  const updateVideoSize = (video_id) => {
    setVideoId(video_id)
  }
  return (
    <div className="App" style={{ height: "inherit" }}>
      <ImageStream src="http://192.168.0.26:8080/stream?topic=/strctl/image_raw" type="ros_compressed" id={videoId} />
      <SimGamepad rosbridgeAddress="ws://192.168.0.26:9090" updateVideoSize={updateVideoSize}/>
    </div>
  );
}

export default SimGamepadDemo;
