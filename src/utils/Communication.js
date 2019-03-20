import MsgPacker from './MsgPacker'
import Cert from './Cert'

const path = require('path')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const SIGNER_PROTO_PATH = path.resolve(__dirname, '../protos/signer.proto')
const LOAD_ARGS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}

const VERSION = '1020181127'
const CHAIN_ID = 'AAAAAAAAAAE='
const RPC_TYPE = {
  LIGHT: 0,
  HEAVY: 1
}

class Communication {
  constructor (signerId, cert) {
    this.signerId = signerId
    this.cert = cert

    // Load the protobuf
    let proto = grpc.loadPackageDefinition(protoLoader.loadSync(SIGNER_PROTO_PATH, LOAD_ARGS))
    this.client = new proto.grpc_signer.GruutSignerService(
      '10.10.10.112:8080',
      // '13.125.161.227:50000',
      grpc.credentials.createInsecure()
    )
  }

  openStreamChannel () {
    let call = this.client.openChannel()
    call.on('data', (message) => {
      console.log(JSON.stringify(message))
      this.routeMsg(MsgPacker.unpack(message.message))
    })

    call.on('end', () => {
      console.log('runStreaming:: Stream End')
      call.end()
    })

    call.on('error', () => {
      console.error('연결이 끊어졌습니다.')
    })

    call.on('status', (status) => {
      console.log(JSON.stringify(status))
    })

    // Identity 전송(Base64 Encoded String을 Byte로 변환하여 전송)
    let identity = {
      sender: Buffer.from(this.signerId)
    }
    console.log('[SEND] open channel :: ' + JSON.stringify(identity))
    call.write(identity)
  }

  sendJoin () {
    // Start joining
    sendJoin(this.client, this.signerId).catch(console.error)
  }

  routeMsg (message) {
    switch (message.header.msgType) {
      case MsgPacker.MSG_TYPE.MSG_CHALLENGE:
        console.log('[RECV] ' + 'MSG_CHALLENGE')
        // sendResponse1(this.client, this.signerId, this.cert, message)
        break
      case MsgPacker.MSG_TYPE.MSG_RESPONSE_2:
        console.log('[RECV] ' + 'MSG_RESPONSE_2')
        break
      case MsgPacker.MSG_TYPE.MSG_ACCEPT:
        console.log('[RECV] ' + 'MSG_ACCEPT')
        break
      case MsgPacker.MSG_TYPE.MSG_REQ_SSIG:
        console.log('[RECV] ' + 'MSG_REQ_SSIG')
        break
      default:
        console.log('[RECV] ' + 'UNKNOWN')
        break
    }
  }
}

export default Communication

/*************************************************************************************************/

function sendJoin (client, signerId) {
  let joinObj = {
    'sID': signerId,
    'time': getTimestamp(),
    'ver': VERSION,
    'cID': CHAIN_ID
  }

  let joinPack = MsgPacker.pack(MsgPacker.MSG_TYPE.MSG_JOIN, joinObj, signerId)

  return new Promise((resolve, reject) => {
    client.signerService({message: joinPack}, getRPCDeadline(RPC_TYPE.LIGHT), function (error, status) {
      if (error) {
        reject(error)
      }
      console.log('[RECV] ' + JSON.stringify(status))
      resolve(status)
    })
  })
}

// eslint-disable-next-line no-unused-vars
function sendResponse1 (client, signerId, cert, msgChallenge) {
  const pubKeyXYHex = Cert.certToPubXYHex(cert)
  let response1Obj = {
    'sID': signerId,
    'time': getTimestamp(),
    'cert': cert,
    'sN': 'luLSQgVDnMyZjkAh8h2HNokaY1Oe9Md6a4VpjcdGgzs=',
    'dhx': pubKeyXYHex.x,
    'dhy': pubKeyXYHex.y,
    'sig': 'QWVMP1UfUJIemaLFqnXvQfGqghVCmYH0yXo1/g5hUWAbouuXdTI/O7Gkgz3C5kXhnIWZ+dHp...'
  }

  let response1Pack = MsgPacker.pack(MsgPacker.MSG_TYPE.MSG_RESPONSE_1, response1Obj, signerId)

  return new Promise((resolve, reject) => {
    client.signerService({message: response1Pack}, getRPCDeadline(RPC_TYPE.LIGHT), function (error, status) {
      if (error) {
        reject(error)
      }
      console.log('[RECV] ' + JSON.stringify(status))
      resolve(status)
    })
  })
}

function getTimestamp () {
  return (Math.floor(Date.now() / 1000)).toString()
}

function getRPCDeadline (rpcType) {
  let timeAllowed = 5000
  switch (rpcType) {
    case RPC_TYPE.LIGHT:
      timeAllowed = 5000 // LIGHT RPC
      break
    case RPC_TYPE.HEAVY:
      timeAllowed = 7000 // HEAVY RPC
      break
    default :
      console.log('Invalid RPC Type: Using Default Timeout')
  }

  return new Date(Date.now() + timeAllowed)
}
