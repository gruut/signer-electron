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
import Cert from '../../utils/Cert'
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
          if (response.status === 200) {
            const pem = response.data.certPem
            const nid = response.data.nid
            if (pem) {
              Cert.writeUserInfo(nid, pem)
            } else {
              // 이미 등록 된 유저일 경우
              console.log('Error: ' + response.data)
            }
          } else {
            console.log('Error: ' + response.data)
          }
        }).catch((error) => {
          console.log('Error: ' + error)
        })
    }
  }
}
</script>
