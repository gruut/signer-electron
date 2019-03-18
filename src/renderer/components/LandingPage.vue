<template>
  <div id="wrapper">
    <main>
      <p>Enter the mobile number</p>
      <section class="mobile-input">
        <input type="text" v-model="phone">
        <button :disabled="!phone.length" @click="getCertificate">Check</button>
      </section>
    </main>
  </div>
</template>

<script>
import Cert from '../../utils/cert'
import qs from 'qs'

export default {
  data () {
    return {
      phone: '',
      parsedCsr: (Cert.createCsr()).split('\r\n').join('')
    }
  },

  methods: {
    getCertificate: function () {
      const uri = 'http://ec2-13-209-161-44.ap-northeast-2.compute.amazonaws.com:48080/v1/users'

      var headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
      var data = {
        phone: this.phone,
        csr: this.parsedCsr
      }

      this.$http.post(`${uri}`, qs.stringify(data), headers)
        .then(response => {
          require('electron').remote.getGlobal('sharedObject').certificate = response.pem
          require('electron').remote.getGlobal('sharedObject').nid = response.nid
          Cert.writeCert(response.pem)
          console.log(response)
        }).catch((error) => {
          console.log('Error: ' + JSON.stringify(error))
        })
    }
  }
}
</script>
