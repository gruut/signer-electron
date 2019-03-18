<template>
  <div id="app">
    <landing-page></landing-page>
  </div>
</template>

<script>
  import LandingPage from '@/components/LandingPage'
  import SigningPage from '@/components/SigningPage'

  export default {
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
