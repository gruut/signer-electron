<template>
  <div v-if=!userInfo>
    <landing-page></landing-page>
  </div>
  <div v-else>
    <signing-page></signing-page>
  </div>
</template>

<script>
  import LandingPage from '@/components/LandingPage'
  import SigningPage from '@/components/SigningPage'
  import Cert from '../utils/Cert'

  export default {
    data () {
      return {
        userInfo: Cert.readUserInfo()
      }
    },

    name: 'gruut-signer-electron',
    components: {
      LandingPage,
      SigningPage
    }
  }
</script>

<style>
  /* CSS */
</style>
