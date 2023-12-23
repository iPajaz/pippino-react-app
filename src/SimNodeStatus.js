
import React, { Component } from 'react';
import { CListGroup, CListGroupItem } from '@coreui/react';
class SimNodeStatusTable extends Component {
  // constructor(props){
  //   super(props);
  //   this.nodes_per_col = this.props.nodes_per_col;
  //   this.nodes_per_col = 3;
  //   this.state = {
  //     node_names: this.props.node_names,
  //     node_status: []
  //   }
  // }

  // updateNodeStatus = (node_status) => {

  // }

  render() {

    const vars = {
      // '--cui-list-group-active-bg': "red",
      // '--cui-list-group-active-border-color': "red",
      // '--cui-list-group-variants.primary': 'red'
      '--cui-list-group-item-padding-y': '3px',
      '--cui-list-group-item-padding-x': '3px',
    }
    var n_chunks = Math.ceil(this.props.node_names.length / this.props.nodes_per_col);
    var node_names_chunk;
    var cols = [];
    for (let i = 0; i < n_chunks; i++){
      node_names_chunk = this.props.node_names.slice(this.props.nodes_per_col*i, this.props.nodes_per_col*(i+1));
      cols.push([<CListGroup className="mb-2">{node_names_chunk.map((name, index) => (<CListGroupItem color={this.props.node_statuses[(this.props.nodes_per_col * i) + index] == 0 ? 'danger' : 'success'} style = { vars } >{name}</CListGroupItem>))}</CListGroup>]);
    }

    return (<>{cols}</>);
  }
}

export default SimNodeStatusTable;