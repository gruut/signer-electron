const lz4 = require('lz4')
const protobuf = require('protobufjs')
const crypto = require('crypto')

const HEADER_LENGTH = 32
const MAC_LENGTH = 64
const MAX_MSG_LENGTH = 4 * 1024 * 1024 /* temporary, 4MB */
const MSG_TYPE = {
  MSG_JOIN: 0x54,
  MSG_CHALLENGE: 0x55,
  MSG_RESPONSE_1: 0x56,
  MSG_RESPONSE_2: 0x57,
  MSG_SUCCESS: 0x58,
  MSG_ACCEPT: 0x59,
  MSG_REQ_SSIG: 0xB2,
  MSG_SSIG: 0xB3
}

class MsgPacker {
  /**
   * Returns MSG_TYPE enum
   */
  static get MSG_TYPE () {
    return MSG_TYPE
  }

  /**
   * Message Format에 맞게 Pack
   * @param {MsgPacker.MSG_TYPE} msgType
   * @param {Object} data JSON object
   * @param {String} senderId Base64 encoded stirng
   */
  static pack (msgType, data, senderId) {
    let zipData = this.zipIt(data)
    let header = this.buildHeader(msgType, zipData, Buffer.from(senderId, 'base64'))
    let mac = this.buildHMAC(zipData.body)
    return Buffer.concat([header, zipData.body, mac], (HEADER_LENGTH + zipData.length + MAC_LENGTH))
  }

  /**
   * Message Format에 맞춰 Unpack
   * @param {Buffer} data
   */
  static unpack (data) {
    let header = this.recoverHeader(data)
    let unpackedMsg = {
      header: header,
      message: this.recoverMsgBodyJson(data, HEADER_LENGTH, (header.totalLength - HEADER_LENGTH)),
      macValidity: this.checkHMAC(data, header)
    }

    return unpackedMsg
  }

  static zipIt (data) {
    let strData = JSON.stringify(data)
    let input = Buffer.from(strData)
    let output = Buffer.allocUnsafe(lz4.encodeBound(strData.length))
    let compressedSize = lz4.encodeBlock(input, output)
    output = output.slice(0, compressedSize)
    var zipData = {
      body: output,
      length: compressedSize
    }

    return zipData
  }

  static unzipIt (data) {
    var uncompressed = Buffer.alloc(MAX_MSG_LENGTH)
    var uncompressedSize = lz4.decodeBlock(data, uncompressed)
    uncompressed = uncompressed.slice(0, uncompressedSize)
    return uncompressed
  }

  static buildHeader (typeByte, zipData, senderId) {
    var head = {
      front: this.headerFront(typeByte),
      totalLength: this.getHeaderLength(zipData.length),
      chainid: this.headerChainId(1),
      sender: this.headerSender(senderId),
      reserved: this.headerReserved()
    }

    return Buffer.concat([head.front, head.totalLength, head.chainid, head.sender, head.reserved], HEADER_LENGTH)
  }

  static recoverHeader (headerBuffer) {
    var header = {
      G: headerBuffer[0],
      version: headerBuffer[1],
      msgType: headerBuffer[2],
      macType: headerBuffer[3],
      compType: headerBuffer[4],
      notUse: headerBuffer[5],
      totalLength: headerBuffer.readInt32BE(6)
    }
    header.chainid = Buffer.alloc(8)
    header.sender = Buffer.alloc(8)
    header.reserved = Buffer.alloc(6)

    headerBuffer.copy(header.chainid, 0, 10, 18)
    headerBuffer.copy(header.sender, 0, 18, 26)
    headerBuffer.copy(header.reserved, 0, 26, 32)

    return header
  }

  static recoverMsgBodyJson (bodyBuffer, HEADER_LENGTH, bodyLength) {
    let objBuffer = Buffer.alloc(bodyLength)
    bodyBuffer.copy(objBuffer, 0, HEADER_LENGTH, HEADER_LENGTH + bodyLength)

    let unzippedObj = this.unzipIt(objBuffer)
    let jsonObj = JSON.parse(unzippedObj)

    return jsonObj
  }

  static checkHMAC (data, header) {
    let macLeft = this.buildHMAC(Buffer.from(data, HEADER_LENGTH, (header.totalLength - HEADER_LENGTH)))
    let macRight = Buffer.from(data, header.totalLength, MAC_LENGTH)
    return (macLeft === macRight)
  }

  static buildHMAC (zipData) {
    return Buffer.from(this.getHMAC(zipData), 'hex')
  }

  static getHMAC (data) {
    const secret = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const hash = crypto.createHmac('sha256', Buffer.from(secret, 'hex'))
      .update(data)
      .digest('hex')
    return hash
  }

  // build front 6 bytes of the header
  static headerFront (typeByte) {
    return Buffer.from([
      0x47, // 'G'
      0x11, // major minor
      typeByte,
      0x01, // MAC -> ECDSA
      0x04, // zip -> lz4
      0x00 // not used
    ])
  }

  static getHeaderLength (length) {
    let buf = Buffer.allocUnsafe(4)
    buf.writeInt32BE((length + HEADER_LENGTH), 0)
    return buf
  }

  static headerChainId (id) {
    let buf = Buffer.allocUnsafe(8).fill(0)
    buf.writeInt32BE(1, 4)
    return buf
  }

  static headerSender (senderId) {
    if (senderId.length > 8) return null
    return Buffer.from(senderId, 'hex')
  }

  static headerReserved () {
    return Buffer.allocUnsafe(6).fill(0)
  }

  static protobufMsgSerializer (PROTO_PATH, msgTypeName, packedMsg) {
    const root = protobuf.loadSync(PROTO_PATH)

    // Obtain a message type
    var msgType = root.lookupType(msgTypeName)
    var payload = {message: packedMsg}
    // var errMsg = msgType.verify(payload)
    // if (errMsg) {
    //   logger.error('failed to verify payload: ' + errMsg)
    // }

    var serializedMsg = msgType.create(payload) // byte packed msg => base64 msg
    return serializedMsg
  }

  static buildSigBuffer (tx) {
    let length = 0
    let bfList = []

    length = this.pushBufferList(bfList, length, Buffer.from(tx.txid, 'base64')) // b64 to buf
    length = this.pushBufferList(bfList, length, this.getBufferedTimestamp(tx.time))
    length = this.pushBufferList(bfList, length, Buffer.from(tx.rID)) // str to buf
    length = this.pushBufferList(bfList, length, Buffer.from(tx.type)) // str to buf
    for (let i = 0; i < tx.content.length; i++) {
      length = this.pushBufferList(bfList, length, Buffer.from(tx.content[i]))
    }

    const bfCombined = Buffer.concat(bfList, length)
    return bfCombined
  }

  static getBufferedTimestamp (strTimestamp) {
    const bfTime = Buffer.allocUnsafe(8)
    bfTime.writeInt32BE(0x0, 0)
    bfTime.writeInt32BE(parseInt(strTimestamp, 10), 4)
    return bfTime
  }

  static pushBufferList (bfList, length, singleBuffer) {
    bfList.push(singleBuffer)
    length += singleBuffer.length
    return length
  }
}

export default MsgPacker
