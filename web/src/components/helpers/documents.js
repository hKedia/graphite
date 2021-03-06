import {
  putFile,
  getFile,
  loadUserData
} from 'blockstack';
import React from 'react'
import { Value } from 'slate'
import update from 'immutability-helper';
import { getMonthDayYear } from '../helpers/getMonthDayYear';
import Html from 'slate-html-serializer';
const { getPublicKeyFromPrivate } = require('blockstack');
const { decryptECIES } = require('blockstack/lib/encryption');
const lzjs = require('lzjs');

const { encryptECIES } = require('blockstack/lib/encryption');

const BLOCK_TAGS = {
  blockquote: 'block-quote',
  p: 'paragraph',
  pre: 'code',
  ul: 'list',
  ol: 'ordered',
  li: 'list-item',
  div: 'align',
  img: 'image'
}
// Add a dictionary of mark tags.
const MARK_TAGS = {
  em: 'italic',
  strong: 'bold',
  u: 'underline',
  pre: 'code',
  strike: 'strikethrough',
  span: 'color'
}

const INLINE_TAGS = {
  a: 'link'
}
const rules = [
  {
    deserialize(el, next) {
      const type = BLOCK_TAGS[el.tagName.toLowerCase()]

      if (type) {
        return {
          object: 'block',
          type: type,
          data: {
            class: el.getAttribute('class'),
          },
          nodes: next(el.childNodes),
        }

      }
    },
    serialize(obj, children) {
      if (obj.object === 'block') {
        switch (obj.type) {
          case 'code':
            return (
              <pre>
                <code>{children}</code>
              </pre>
            )
          case 'paragraph':
            return <p className={obj.data.get('className')}>{children}</p>
          case 'block-quote':
            return <blockquote>{children}</blockquote>
          case 'list':
            return <ul>{children}</ul>
          case 'heading-one':
            return <h1>{children}</h1>
          case 'heading-two':
            return <h2>{children}</h2>
          case 'heading-three':
            return <h3>{children}</h3>
          case 'heading-four':
            return <h4>{children}</h4>
          case 'heading-five':
            return <h5>{children}</h5>
          case 'heading-six':
            return <h6>{children}</h6>
          case 'list-item':
            return <li>{children}</li>
          case 'ordered':
            return <ol>{children}</ol>
          case 'table':
            const headers = !obj.data.get('headless');
            const rows = children;
            const split = (!headers || !rows || !rows.size || rows.size===1)
                ?  { header: null, rows: rows }
                : {
                    header: rows.get(0),
                    rows: rows.slice(1),
                 }

            return (
                <table>
                    {headers &&
                        <thead>{split.header}</thead>
                    }
                    <tbody>{split.rows}</tbody>
                </table>
            );
          case 'table_row': return <tr>{children}</tr>;
          case 'table_cell': return <td>{children}</td>;
          case 'align':
            return <div className={obj.data.get('class')}>{children}</div>
          case 'code-block':
            return <code>{children}</code>
          case 'image':
            return <img src={ obj.data.get('src') } alt='thumbnail'/>
          case 'video':
            return <iframe src={ obj.data.get('src') } title="video" />
          default: return ''
        }
      }
    }
  },
  // Add a new rule that handles marks...
  {
    deserialize(el, next) {
      const type = MARK_TAGS[el.tagName.toLowerCase()]
      if (type) {
        return {
          object: 'mark',
          type: type,
          data: {
            class: el.getAttribute('class'),
          },
          nodes: next(el.childNodes),
        }
      }
    },
    serialize(obj, children) {
      if (obj.object === 'mark') {
        switch (obj.type) {
          case 'bold':
            return <strong>{children}</strong>
          case 'italic':
            return <em>{children}</em>
          case 'underline':
            return <u>{children}</u>
          case 'strikethrough':
            return <strike>{children}</strike>
          case 'color':
            return <span className={obj.data.get('class')}>{children}</span>
          case 'code':
            return <pre><code>{children}</code></pre>
          case 'code-block':
            return <pre className={obj.data.get('className')}><code>{children}</code></pre>
          default: return ''
        }
      }
    }
  },
    {
      deserialize(el, next) {
        const type = INLINE_TAGS[el.tagName.toLowerCase()]
        if (type) {
          // return console.log(el.style)
          return {
            object: 'inline',
            type: type,
            data: {
              href: el.getAttribute('href'),
              src: el.getArrtribute('src')
              // style: JSON.parse('{' + JSON.stringify(el.getAttribute('style')).split(':')[0] + '"' + JSON.parse(JSON.stringify(':')) + '"' + JSON.stringify(el.getAttribute('style')).split(':')[1] + '}'),
            },
            nodes: next(el.childNodes),
          }
        }
      },
      serialize(obj, children) {
        if (obj.object === 'inline') {
          switch (obj.type) {
            case 'link':
              return <a href={obj.data.get('href')}>{children}</a>
            case 'color':
              return <span style={ obj.data.get('style') }>{children}</span>
            default: return ''
          }
        }
      },
  },
]

const html = new Html({ rules })

export function loadCollection() {
  this.setState({ results: [] })
  getFile("documentscollection.json", {decrypt: true})
   .then((fileContents) => {
     if(JSON.parse(fileContents || '{}')) {
       if(JSON.parse(fileContents).value) {
         this.setState({ value: JSON.parse(fileContents || '{}').value, filteredValue: JSON.parse(fileContents || '{}').value, loading: false });
       } else {
         this.setState({ value: JSON.parse(fileContents), filteredValue: JSON.parse(fileContents), loading: false });
       }

     } else {
       console.log("No saved files");
       this.setState({ loading: false });
     }
   })
    .catch(error => {
      console.log(error);
    });
}

export function setTags(e) {
  this.setState({ tag: e.target.value});
}

export function handleKeyPress(e) {
  let keycode = (e.keyCode ? e.keyCode : e.which);
    if (keycode === '13') {
      if(this.state.tag !=="") {
        this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
          this.setState({ tag: "" });
        });
      }
    }
  // if (e.key === 'Enter') {
  //   console.log("trying")
  //   this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
  //     this.setState({ tag: "" });
  //   });
  // }
}

export function addTagManual(doc) {
  if(this.state.tag !=="") {
    this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
      let value = this.state.value;
      const thisDoc = value.find((document) => { return document.id.toString() === doc.id.toString()});
      let index = thisDoc && thisDoc.id;
      function findObjectIndex(doc) {
          return doc.id === index; //this is comparing numbers
      }
      this.setState({index: value.findIndex(findObjectIndex), tag: "" });
    });
  }

}

export function handleaddItem() {
  this.setState({loading: true})
  const rando = Date.now();
  const object = {};
  const objectTwo = {}
  if(window.location.href.includes('vault')) {
    this.setState({ loading: true, })
    object.title = this.state.name;
    object.lastUpdate = Date.now();
    object.id = rando;
    object.updated = getMonthDayYear();
    object.singleDocTags = [];
    object.sharedWith = [];
    object.fileType = 'documents';
    objectTwo.title = object.title;
    objectTwo.id = object.id;
    objectTwo.updated = object.created;
    objectTwo.content = this.state.content;
    objectTwo.tags = [];
    objectTwo.sharedWith = [];
  } else {
    object.title = "Untitled";
    object.lastUpdate = Date.now();
    object.id = rando;
    object.updated = getMonthDayYear();
    object.singleDocTags = [];
    object.sharedWith = [];
    object.fileType = 'documents';
    objectTwo.title = object.title;
    objectTwo.id = object.id;
    objectTwo.updated = object.created;
    objectTwo.content = "";
    objectTwo.tags = [];
    objectTwo.sharedWith = [];
  }

  this.setState({ value: [...this.state.value, object], filteredValue: [...this.state.filteredValue, object], singleDoc: objectTwo, tempDocId: object.id  }, () => {
    this.saveNewFile();
  });
}

export function filterList(event){
  var updatedList = this.state.value;
  updatedList = updatedList.filter(function(item){
    if(item.title !== undefined) {
      return item.title.toLowerCase().search(
        event.target.value.toLowerCase()) !== -1;
    }
    return null;
  });
  this.setState({filteredValue: updatedList});
}

export function saveNewFile() {
  putFile("documentscollection.json", JSON.stringify(this.state.value), {encrypt:true})
    .then(() => {
      // this.saveNewSingleDoc();
      console.log("Saved Collection!");
      setTimeout(this.saveNewSingleDoc, 200);
    })
    .catch(e => {
      console.log("e");
      console.log(e);
      this.setState({ loading: false })
      alert("Trouble saving");
    });
}

export function saveNewSingleDoc() {
  const file = this.state.tempDocId;
  const fullFile = '/documents/' + file + '.json'
  putFile(fullFile, JSON.stringify(this.state.singleDoc), {encrypt:true})
    .then(() => {
      if(window.location.href.includes('vault')) {
        window.location.replace('/documents');
      } else if(!window.location.href.includes('google') && !window.location.href.includes('documents/doc/') && !window.location.href.includes('file-explorer')) {
        this.setState({ redirect: true });
      } else if(window.location.href.includes('documents/doc/')) {
        window.location.replace(window.location.origin + '/documents/doc/' + this.state.tempDocId);
      } else if(window.location.href.includes('file-explorer')) {
        window.location.replace('/documents');
      }
      if(this.state.importAll) {
        this.setState({ count: this.state.count + 1 });
      }
    })
    .then(() => {
      if(this.state.importAll) {
        this.importAllGDocs();
      }
    })
    .catch(e => {
      console.log("e");
      console.log(e);
      this.setState({ loading: false })
      alert("Trouble saving")
    });
}

export function handlePageChange(props) {
  this.setState({
    currentPage: props
  });
}

export function handleCheckbox(event) {
  let checkedArray = this.state.docsSelected;
    let selectedValue = event.target.value;

      if (event.target.checked === true) {
        checkedArray.push(selectedValue);
          this.setState({
            docsSelected: checkedArray
          });
        if(checkedArray.length === 1) {
          this.setState({activeIndicator: true});

        } else {
          this.setState({activeIndicator: false});
        }
      } else {
        this.setState({activeIndicator: false});
        let valueIndex = checkedArray.indexOf(selectedValue);
          checkedArray.splice(valueIndex, 1);

          this.setState({
            docsSelected: checkedArray
          });
          if(checkedArray.length === 1) {
            this.setState({activeIndicator: true});
          } else {
            this.setState({activeIndicator: false});
          }
      }
}

export function sharedInfo(props, doc) {
  const user = props;
  const options = { username: user, zoneFileLookupURL: "https://core.blockstack.org/v1/names", decrypt: false}
  this.setState({ receiverID: props, rtc: true, loading: true })
  getFile('key.json', options)
    .then((file) => {
      this.setState({ pubKey: JSON.parse(file)})
    })
      .then(() => {
        this.loadSharedCollection(doc);
      })
      .catch(error => {
        console.log("No key: " + error);
        this.setState({ loading: false, displayMessage: true, results: [] }, () => {
          setTimeout(() => this.setState({displayMessage: false}), 3000);
        });
      });
}

export function sharedInfoStatic(props) {
  const user = props;
  const options = { username: user, zoneFileLookupURL: "https://core.blockstack.org/v1/names", decrypt: false}
  this.setState({ receiverID: props, rtc: false })
  getFile('key.json', options)
    .then((file) => {
      this.setState({ pubKey: JSON.parse(file)})
    })
      .then(() => {
        this.loadSharedCollection();
      })
      .catch(error => {
        console.log("No key: " + error);
        window.Materialize.toast(props + " has not logged into Graphite yet. Ask them to log in before you share.", 4000);
        this.setState({ shareModal: "hide", loadingTwo: "hide", contactDisplay: ""});
      });
}

export function loadSharedCollection (doc) {
  // const user = this.state.receiverID;
  // const file = "shared.json";
  // getFile(user + file, {decrypt: true})
  const pubKey = this.state.pubKey;
  const fileName = 'shareddocs.json'
  const file = 'mine/' + pubKey + '/' + fileName;
  getFile(file, {decrypt: true})
    .then((fileContents) => {
      if(fileContents) {
        this.setState({ sharedCollection: JSON.parse(fileContents || '{}') })
      } else {
        this.setState({ sharedCollection: [] });
      }
    })
    .then(() => {
      this.loadSingle(doc);
    })
    .catch((error) => {
      console.log(error)
    });
}

export function loadSingle(doc) {
    const thisFile = doc.id;
    const fullFile = '/documents/' + thisFile + '.json';
    let thisContent;
    getFile(fullFile, {decrypt: true})
     .then((fileContents) => {
       if(JSON.parse(fileContents).compressed === true) {
         console.log("compressed doc")
         this.setState({
           content: html.deserialize(lzjs.decompress(JSON.parse(fileContents).content)),
           title: JSON.parse(fileContents || '{}').title,
           tags: JSON.parse(fileContents || '{}').tags,
           idToLoad: JSON.parse(fileContents || '{}').id,
           singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
           docLoaded: true,
           readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
           rtc: JSON.parse(fileContents || '{}').rtc || false,
           sharedWith: JSON.parse(fileContents || '{}').sharedWith,
           teamDoc: JSON.parse(fileContents || '{}').teamDoc,
           compressed: JSON.parse(fileContents || '{}').compressed || false,
           spacing: JSON.parse(fileContents || '{}').spacing,
           lastUpdate: JSON.parse(fileContents).lastUpdate,
           jsonContent: true
         })
       } else {
         console.log("Not compressed")
         if(JSON.parse(fileContents).jsonContent) {
           console.log("Json doc")
           thisContent = JSON.parse(fileContents).content;
           this.setState({
             content: Value.fromJSON(thisContent),
             title: JSON.parse(fileContents || '{}').title,
             tags: JSON.parse(fileContents || '{}').tags,
             idToLoad: JSON.parse(fileContents || '{}').id,
             singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
             docLoaded: true,
             readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
             rtc: JSON.parse(fileContents || '{}').rtc || false,
             sharedWith: JSON.parse(fileContents || '{}').sharedWith,
             teamDoc: JSON.parse(fileContents || '{}').teamDoc,
             compressed: JSON.parse(fileContents || '{}').compressed || false,
             spacing: JSON.parse(fileContents || '{}').spacing,
             lastUpdate: JSON.parse(fileContents).lastUpdate,
             jsonContent: true
           })
         } else {
           console.log("html doc")
           this.setState({
             content: html.deserialize(JSON.parse(fileContents).content),
             title: JSON.parse(fileContents || '{}').title,
             tags: JSON.parse(fileContents || '{}').tags,
             idToLoad: JSON.parse(fileContents || '{}').id,
             singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
             docLoaded: true,
             readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
             rtc: JSON.parse(fileContents || '{}').rtc || false,
             sharedWith: JSON.parse(fileContents || '{}').sharedWith,
             teamDoc: JSON.parse(fileContents || '{}').teamDoc,
             compressed: JSON.parse(fileContents || '{}').compressed || false,
             spacing: JSON.parse(fileContents || '{}').spacing,
             lastUpdate: JSON.parse(fileContents).lastUpdate,
           })
         }

       }

     })
      .then(() => {
        this.setState({ sharedWithSingle: [...this.state.sharedWithSingle, this.state.receiverID] }, () => {
          this.getCollection(doc)
        });
      })
      .catch(error => {
        console.log(error);
      });
}

export function getCollection(doc) {
  getFile("documentscollection.json", {decrypt: true})
  .then((fileContents) => {
    if(JSON.parse(fileContents).value) {
      this.setState({ value: JSON.parse(fileContents || '{}').value })
      this.setState({ initialLoad: "hide" });
    } else {
      this.setState({ value: JSON.parse(fileContents || '{}') })
      this.setState({ initialLoad: "hide" });
    }
  }).then(() =>{
    let value = this.state.value;
    const thisDoc = value.find((document) => { return document.id.toString() === doc.id.toString()});
    let index = thisDoc && thisDoc.id;
    function findObjectIndex(doc) {
        return doc.id === index; //this is comparing numbers
    }
    this.setState({index: value.findIndex(findObjectIndex) });
  })
    .then(() => {
      this.share(doc);
    })
    .catch(error => {
      console.log(error);
    });
}

export function share(doc) {
  let thisContent = this.state.content;
  const object = {};
  object.title = this.state.title;
  object.jsonContent = true;
  object.content = thisContent.toJSON();
  object.id = doc.id;
  object.updated = getMonthDayYear();
  object.sharedWith = this.state.sharedWithSingle;
  object.lastUpdate = Date.now
  object.singleDocTags = this.state.singleDocTags;
  object.words = this.state.words;
  object.rtc = this.state.rtc;
  object.compressed = false;
  const index = this.state.index;
  const updatedDocs = update(this.state.value, {$splice: [[index, 1, object]]});  // array.splice(start, deleteCount, item1)
  this.setState({value: updatedDocs, singleDoc: object, sharedCollection: [...this.state.sharedCollection, object]});

  setTimeout(() => this.saveSharedFile(doc), 300);
}

export function saveSharedFile(doc) {
  // const user = this.state.receiverID;
  // const file = "shared.json";
  //
  // putFile(user + file, JSON.stringify(this.state.sharedCollection), {encrypt: true})
  const fileName = 'shareddocs.json'
  const pubKey = this.state.pubKey;
  const file = 'mine/' + pubKey + '/' + fileName;
  putFile(file, JSON.stringify(this.state.sharedCollection), {encrypt: true})
    .then(() => {
      console.log("Shared Collection Saved");

    })

    const data = this.state.sharedCollection;
    const encryptedData = JSON.stringify(encryptECIES(pubKey, JSON.stringify(data)));
    const directory = 'shared/' + pubKey + fileName;
    putFile(directory, encryptedData, {encrypt: false})
    .then(() => {
      console.log("saved")
    })
    .catch(e => {
      console.log(e);
    });
    putFile(doc.id + 'sharedwith.json', JSON.stringify(this.state.sharedWith), {encrypt: true})
    .then(() => {
      // this.handleAutoAdd();
      // this.loadAvatars();
      this.saveSingleFile(doc);
    })
    .catch(e => {
      console.log(e);
    });
}

export function saveSingleFile(doc) {
  const file = doc.id;
  const fullFile = '/documents/' + file + '.json'
  putFile(fullFile, JSON.stringify(this.state.singleDoc), {encrypt:true})
    .then(() => {
      console.log("Saved!");
      this.saveCollection();
    })
    .catch(e => {
      console.log("e");
      console.log(e);
    });
}

export function saveCollection() {
  putFile("documentscollection.json", JSON.stringify(this.state.value), {encrypt: true})
    .then(() => {
      console.log("Saved Collection");
      // this.sendFile();
      this.setState({ title: "Untitled"})
    })
    .then(() => {
      this.loadCollection();
    })
    .catch(e => {
      console.log("e");
      console.log(e);
    });
}

export function sendFile() {
  const user = this.state.receiverID;
  const userShort = user.slice(0, -3);
  const fileName = 'shareddocs.json'
  const file = userShort + fileName;
  const publicKey = this.state.pubKey;
  const data = this.state.sharedCollection;
  const encryptedData = JSON.stringify(encryptECIES(publicKey, JSON.stringify(data)));
  const directory = '/shared/' + file;
  putFile(directory, encryptedData, {encrypt: false})
    .then(() => {
      console.log("Shared encrypted file ");
      window.Materialize.toast('Document shared with ' + this.state.receiverID, 4000);
      this.loadCollection();
      this.setState({shareModal: "hide", loadingTwo: "hide", contactDisplay: ""});
    })
    .catch(e => {
      console.log(e);
    });
}

export function loadSingleTags(doc) {
  const thisFile = doc.id;
  const fullFile = '/documents/' + thisFile + '.json';

  getFile(fullFile, {decrypt: true})
   .then((fileContents) => {
     let thisContent;
     if(JSON.parse(fileContents || '{}').singleDocTags || JSON.parse(fileContents).tags) {
       if(JSON.parse(fileContents).singleDocTags) {
         if(JSON.parse(fileContents).compressed === true) {
         console.log("compressed doc")
         this.setState({
           content: html.deserialize(lzjs.decompress(JSON.parse(fileContents).content)),
           title: JSON.parse(fileContents || '{}').title,
           tags: JSON.parse(fileContents || '{}').tags,
           idToLoad: JSON.parse(fileContents || '{}').id,
           singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
           docLoaded: true,
           readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
           rtc: JSON.parse(fileContents || '{}').rtc || false,
           sharedWith: JSON.parse(fileContents || '{}').sharedWith,
           teamDoc: JSON.parse(fileContents || '{}').teamDoc,
           compressed: JSON.parse(fileContents || '{}').compressed || false,
           spacing: JSON.parse(fileContents || '{}').spacing,
           lastUpdate: JSON.parse(fileContents).lastUpdate,
           jsonContent: true
         }, () => {
           if(this.state.tag !=="") {
             this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
               this.setState({ tag: "" });
             });
           }
         })
       } else {
         console.log("Not compressed")
         if(JSON.parse(fileContents).jsonContent) {
           console.log("Json doc")
           thisContent = JSON.parse(fileContents).content;
           this.setState({
             content: Value.fromJSON(thisContent),
             title: JSON.parse(fileContents || '{}').title,
             tags: JSON.parse(fileContents || '{}').tags,
             idToLoad: JSON.parse(fileContents || '{}').id,
             singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
             docLoaded: true,
             readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
             rtc: JSON.parse(fileContents || '{}').rtc || false,
             sharedWith: JSON.parse(fileContents || '{}').sharedWith,
             teamDoc: JSON.parse(fileContents || '{}').teamDoc,
             compressed: JSON.parse(fileContents || '{}').compressed || false,
             spacing: JSON.parse(fileContents || '{}').spacing,
             lastUpdate: JSON.parse(fileContents).lastUpdate,
             jsonContent: true
           }, () => {
             if(this.state.tag !=="") {
               this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
                 this.setState({ tag: "" });
               });
             }
           })
         } else {
           console.log("html doc")
           this.setState({
             content: html.deserialize(JSON.parse(fileContents).content),
             title: JSON.parse(fileContents || '{}').title,
             tags: JSON.parse(fileContents || '{}').tags,
             idToLoad: JSON.parse(fileContents || '{}').id,
             singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
             docLoaded: true,
             readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
             rtc: JSON.parse(fileContents || '{}').rtc || false,
             sharedWith: JSON.parse(fileContents || '{}').sharedWith,
             teamDoc: JSON.parse(fileContents || '{}').teamDoc,
             compressed: JSON.parse(fileContents || '{}').compressed || false,
             spacing: JSON.parse(fileContents || '{}').spacing,
             lastUpdate: JSON.parse(fileContents).lastUpdate,
           }, () => {
             if(this.state.tag !=="") {
               this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
                 this.setState({ tag: "" });
               });
             }
           })
         }
       }
      } else if(JSON.parse(fileContents).tags) {
        if(JSON.parse(fileContents).compressed === true) {
        console.log("compressed doc")
        this.setState({
          content: html.deserialize(lzjs.decompress(JSON.parse(fileContents).content)),
          title: JSON.parse(fileContents || '{}').title,
          tags: JSON.parse(fileContents || '{}').tags,
          idToLoad: JSON.parse(fileContents || '{}').id,
          singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
          docLoaded: true,
          readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
          rtc: JSON.parse(fileContents || '{}').rtc || false,
          sharedWith: JSON.parse(fileContents || '{}').sharedWith,
          teamDoc: JSON.parse(fileContents || '{}').teamDoc,
          compressed: JSON.parse(fileContents || '{}').compressed || false,
          spacing: JSON.parse(fileContents || '{}').spacing,
          lastUpdate: JSON.parse(fileContents).lastUpdate,
          jsonContent: true
        }, () => {
          if(this.state.tag !=="") {
            this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
              this.setState({ tag: "" });
            });
          }
        })
      } else {
        console.log("Not compressed")
        if(JSON.parse(fileContents).jsonContent) {
          console.log("Json doc")
          thisContent = JSON.parse(fileContents).content;
          this.setState({
            content: Value.fromJSON(thisContent),
            title: JSON.parse(fileContents || '{}').title,
            tags: JSON.parse(fileContents || '{}').tags,
            idToLoad: JSON.parse(fileContents || '{}').id,
            singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
            docLoaded: true,
            readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
            rtc: JSON.parse(fileContents || '{}').rtc || false,
            sharedWith: JSON.parse(fileContents || '{}').sharedWith,
            teamDoc: JSON.parse(fileContents || '{}').teamDoc,
            compressed: JSON.parse(fileContents || '{}').compressed || false,
            spacing: JSON.parse(fileContents || '{}').spacing,
            lastUpdate: JSON.parse(fileContents).lastUpdate,
            jsonContent: true
          }, () => {
            if(this.state.tag !=="") {
              this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
                this.setState({ tag: "" });
              });
            }
          })
        } else {
          console.log("html doc")
          this.setState({
            content: html.deserialize(JSON.parse(fileContents).content),
            title: JSON.parse(fileContents || '{}').title,
            tags: JSON.parse(fileContents || '{}').tags,
            idToLoad: JSON.parse(fileContents || '{}').id,
            singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
            docLoaded: true,
            readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
            rtc: JSON.parse(fileContents || '{}').rtc || false,
            sharedWith: JSON.parse(fileContents || '{}').sharedWith,
            teamDoc: JSON.parse(fileContents || '{}').teamDoc,
            compressed: JSON.parse(fileContents || '{}').compressed || false,
            spacing: JSON.parse(fileContents || '{}').spacing,
            lastUpdate: JSON.parse(fileContents).lastUpdate,
          }, () => {
            if(this.state.tag !=="") {
              this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
                this.setState({ tag: "" });
              });
            }
          })
        }
      }
      }

    } else {
      this.setState({
        content: html.deserialize(JSON.parse(fileContents).content),
        title: JSON.parse(fileContents || '{}').title,
        tags: JSON.parse(fileContents || '{}').tags,
        idToLoad: JSON.parse(fileContents || '{}').id,
        singleDocIsPublic: JSON.parse(fileContents || '{}').singleDocIsPublic, //adding this...
        docLoaded: true,
        readOnly: JSON.parse(fileContents || '{}').readOnly, //NOTE: adding this, to setState of readOnly from getFile...
        rtc: JSON.parse(fileContents || '{}').rtc || false,
        sharedWith: JSON.parse(fileContents || '{}').sharedWith,
        teamDoc: JSON.parse(fileContents || '{}').teamDoc,
        compressed: JSON.parse(fileContents || '{}').compressed || false,
        spacing: JSON.parse(fileContents || '{}').spacing,
        lastUpdate: JSON.parse(fileContents).lastUpdate,
      }, () => {
        if(this.state.tag !=="") {
          this.setState({ singleDocTags: [...this.state.singleDocTags, this.state.tag]}, () => {
            this.setState({ tag: "" });
          });
        }
      })
    }
   })
   .then(() => {
     this.getCollectionTags(doc);
   })
    .catch(error => {
      console.log(error);
    });
}

export function getCollectionTags(doc) {
  getFile("documentscollection.json", {decrypt: true})
  .then((fileContents) => {
     if(JSON.parse(fileContents).value) {
       this.setState({ value: JSON.parse(fileContents || '{}').value })
       this.setState({ initialLoad: "hide" });
     } else {
       this.setState({ value: JSON.parse(fileContents || '{}') })
       this.setState({ initialLoad: "hide" });
     }
  }).then(() =>{
    let value = this.state.value;
    const thisDoc = value.find((document) => { return document.id.toString() === doc.id.toString()});
    let index = thisDoc && thisDoc.id;
    function findObjectIndex(doc) {
        return doc.id === index; //this is comparing numbers
    }
    this.setState({ index: value.findIndex(findObjectIndex) });
  })
    .catch(error => {
      console.log(error);
    });
}

export function saveNewTags(doc) {
  this.setState({ loading: true });
  let content = this.state.content;
  const object = {};
  object.id = doc.id;
  object.title = this.state.title;
  object.updated = getMonthDayYear();
  object.singleDocTags = this.state.singleDocTags;
  object.content = content.toJSON();
  object.jsonContent = true;
  object.sharedWith = this.state.sharedWith;
  object.lastUpdate = Date.now();
  object.compressed = false;
  const objectTwo = {};
  objectTwo.title = this.state.title;
  objectTwo.id = doc.id;
  objectTwo.updated = getMonthDayYear();
  objectTwo.sharedWith = this.state.sharedWith;
  objectTwo.singleDocTags = this.state.singleDocTags;
  objectTwo.lastUpdate = Date.now;
  const index = this.state.index;
  const updatedDoc = update(this.state.value, {$splice: [[index, 1, objectTwo]]});
  this.setState({value: updatedDoc, filteredValue: updatedDoc, singleDoc: object }, () => {
    this.saveFullCollectionTags(doc);
  });

}

export function saveFullCollectionTags(doc) {
  putFile("documentscollection.json", JSON.stringify(this.state.value), {encrypt: true})
    .then(() => {
      console.log("Saved");
      this.saveSingleDocTags(doc);
    })
    .catch(e => {
      console.log("e");
      console.log(e);
    });
}

export function saveSingleDocTags(doc) {
  const thisFile = doc.id;
  const fullFile = '/documents/' + thisFile + '.json';
  putFile(fullFile, JSON.stringify(this.state.singleDoc), {encrypt:true})
    .then(() => {
      console.log("Saved tags");
      this.loadCollection();
    })
    .catch(e => {
      console.log("e");
      console.log(e);
    });
}

export function deleteTag(tag, type) {
  // let tags;
  // if(doc.singleDocTags) {
  //   tags = doc.singleDocTags;
  // } else if(doc.tags) {
  //   tags = doc.tags;
  // }
  // this.setState({ singleDocTags: tags}, () => {
  //   let singleDocTags = this.state.singleDocTags;
  //   const thisTag = singleDocTags.find((a) => { return a === tag});
  //   let tagIndex = thisTag;
  //   function findObjectIndex(a) {
  //       return a === tagIndex; //this is comparing numbers
  //   }
  //   this.setState({ tagIndex: tags.findIndex(findObjectIndex) }, () => {
  //     tags.splice(this.state.tagIndex, 1);
  //     this.setState({singleDocTags: tags});
  //   });
  // })
}

export function collabFilter(props) {
  let value = this.state.value;
  let collaboratorFilter = value.filter(x => typeof x.sharedWith !== 'undefined' ? x.sharedWith.includes(props) : console.log(""));
  this.setState({ filteredValue: collaboratorFilter, appliedFilter: true});
}

export function tagFilter(props) {
  let value = this.state.value;
  let tagFilter = value.filter(x => typeof x.singleDocTags !== 'undefined' ? x.singleDocTags.includes(props) : null);
  this.setState({ filteredValue: tagFilter, appliedFilter: true});
}

export function dateFilter(props) {
  let value = this.state.value;
  let definedDate = value.filter((val) => { return val.updated !==undefined });
  let dateFilter = definedDate.filter(x => x.updated.includes(props));
  this.setState({ filteredValue: dateFilter, appliedFilter: true});
}

export function clearFilter() {
  this.setState({ appliedFilter: false, filteredValue: this.state.value});
}

export function setDocsPerPage(e) {
  this.setState({ docsPerPage: e.target.value});
}

export function loadTeamDocs() {
  const { team, count } = this.state;
  if(team.length > count) {
    let publicKey = getPublicKeyFromPrivate(loadUserData().appPrivateKey);
    let fileString = 'shareddocs.json'
    let file = publicKey + fileString;
    const directory = 'shared/' + file;
    const user = team[count].blockstackId;
    const options = { username: user, zoneFileLookupURL: "https://core.blockstack.org/v1/names", decrypt: false}
    getFile(directory, options)
     .then((fileContents) => {
       let privateKey = loadUserData().appPrivateKey;
       this.setState({
         docs: this.state.docs.concat(JSON.parse(decryptECIES(privateKey, JSON.parse(fileContents)))),
         count: this.state.count + 1
       })
     })
     .then(() => {
       this.loadTeamDocs();
     })
      .catch(error => {
        console.log(error);
        this.setState({ count: this.state.count + 1})
        this.loadTeamDocs();
      });
  } else {
    this.setState({ count: 0, loadingIndicator: false });
  }
}

export function handleRestore(file) {
  let content = file.content;
  console.log(file);
  this.setState({loading: true})
  const rando = Date.now();
  const object = {};
  const objectTwo = {}
  this.setState({ loading: true, })
  object.title = file.title;
  object.lastUpdate = Date.now();
  object.id = rando;
  object.updated = getMonthDayYear();
  object.singleDocTags = file.singleDocTags || [];
  object.sharedWith = file.sharedWith || [];
  object.fileType = 'documents';
  objectTwo.title = object.title;
  objectTwo.id = object.id;
  objectTwo.updated = object.created;
  objectTwo.content = content.toJSON();
  objectTwo.jsonContent = true;
  objectTwo.singleDocTags = object.singleDocTags;
  objectTwo.sharedWith = object.sharedWith;

  this.setState({ value: [...this.state.value, object], filteredValue: [...this.state.filteredValue, object], singleDoc: objectTwo, tempDocId: object.id  }, () => {
    this.saveNewFile();
  });
}
