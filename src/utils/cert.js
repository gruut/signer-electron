const cryptoUtils = require('jsrsasign')
const path = require('path')
const fs = require('fs')

class Cert {
  static createCsr () {
    let ec = new cryptoUtils.crypto.ECDSA({'curve': 'secp256k1'})
    ec.generateKeyPairHex()

    let csri = new cryptoUtils.asn1.csr.CertificationRequestInfo()
    csri.setSubjectByParam({'str': '/CN=SELF_CERT'})
    csri.setSubjectPublicKeyByGetKey(ec)

    let csr = new cryptoUtils.asn1.csr.CertificationRequest({'csrinfo': csri})
    csr.sign('SHA256withECDSA', ec)

    return csr.getPEMString()
  }

  static readUserInfo () {
    try {
      const userInfo = fs.readFileSync(path.resolve(__dirname, '../user_info.json')).toString()
      return userInfo
    } catch (err) {
      return null
    }
  }

  static writeUserInfo (nid, certPem) {
    try {
      const userInfo = {
        nid: nid,
        cert: certPem
      }
      fs.writeFileSync(path.resolve(__dirname, '../user_info.json'), JSON.stringify(userInfo), 'utf8')
      console.log(path.resolve(__dirname, '../user_info.json'))
    } catch (err) {
      console.log(err)
    }
  }

  static certToPubXYHex (certPem) {
    let certHex = cryptoUtils.pemtohex(certPem, 'CERTIFICATE')
    let ec = new cryptoUtils.crypto.ECDSA()
    ec.readCertPubKeyHex(certHex)
    return ec.getPublicKeyXYHex()
  }
}

export default Cert
