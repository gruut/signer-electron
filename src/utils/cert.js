const cryptoUtils = require('jsrsasign')
const path = require('path')
const fs = require('fs')

class Cert { // eslint-disable-line no-unused-vars
  static createCsr () {
    var ec = new cryptoUtils.crypto.ECDSA({'curve': 'secp256k1'})
    ec.generateKeyPairHex()

    var csri = new cryptoUtils.asn1.csr.CertificationRequestInfo()
    csri.setSubjectByParam({'str': '/CN=SELF_CERT'})
    csri.setSubjectPublicKeyByGetKey(ec)

    var csr = new cryptoUtils.asn1.csr.CertificationRequest({'csrinfo': csri})
    csr.sign('SHA256withECDSA', ec)

    return csr.getPEMString()
  }

  static readCert () {
    const certPem = fs.readFileSync(path.resolve(__dirname, '../certificate.pem')).toString()
    fs.unlinkSync(path.resolve(__dirname, '../certificate.pem'))

    return certPem
  }

  static writeCert (certPem) {
    try {
      fs.writeFileSync(path.resolve(__dirname, '../certificate.pem'), certPem, 'utf8')
      fs.unlinkSync(path.resolve(__dirname, '../certificate.pem'))
      console.log(path.resolve(__dirname, '../certificate.pem'))
    } catch (err) {
      console.log(err)
    }
  }
}

export default Cert
