import React, { Component } from 'react';
import socketIOClient from 'socket.io-client';

import SlateEditor from './SlateEditor';

class SocketEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      endpoint: 'http://localhost:4001'
    }

    this.uniqueID = Math.round(Math.random() * 1000000000000);

    this.socket = socketIOClient(this.state.endpoint);

    this.socket.on('update content', data => {
      const content = JSON.parse(data)
      const { uniqueID, content: ops } = content;
      console.log(ops)
      if (ops !== null && this.uniqueID !== uniqueID) {
        setTimeout(() => {
          try {
            this.slate.applyOperations(ops);
          } catch(e) {
            console.log(e)
          }
        });
      }
    });
  }

  send = content => {
    const data = JSON.stringify({ content, uniqueID: this.uniqueID });
    // console.log(data);
    this.socket.emit('update content', data);
  }

  onChange = change => {
    const ops = change.operations
    // console.log(ops);
    const ops2 = ops
      .filter(o => o.type !== 'set_selection' && o.type !== 'set_value' && o.type !== undefined && (!o.data || !o.data.has('source')))
      .toArray()
      // .toJS()
      .map(o => ({ ...o, data: { source: this.uniqueID } }))


    // console.log(ops2)
    if (ops2.length > 0) {
      this.send(ops);
    }
  }

  render() {
    return (
      <SlateEditor
        ref={slateE => { this.slate = slateE; }}
        onChange={this.onChange}
        content={this.props.content}
        value={this.props.content}
        handleChange={this.props.handleChange}
        docLoaded={this.props.docLoaded}
        idToLoad={this.props.idToLoad}
      />
    );
  }
};

export default SocketEditor;