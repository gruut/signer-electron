<template>
  <div id="wrapper">
    <main>
      <p>Let's do it!</p>
      <button :disabled="!nid.length" @click="openChannel">Open Channel</button>
      <button :disabled="!nid.length" @click="sendJoin">Send JOIN</button>
    </main>
  </div>
</template>

<script>
import Cert from '../../utils/Cert'
import Communiaction from '../../utils/Communication'

export default {
  data () {
    return {
      nid: JSON.parse(Cert.readUserInfo()).nid,
      cert: JSON.parse(Cert.readUserInfo()).cert
    }
  },
  mounted: function () {
    this.communication = new Communiaction(this.nid, this.cert)
  },
  methods: {
    openChannel: function () {
      this.communication.openStreamChannel()
    },
    sendJoin: function () {
      this.communication.sendJoin()
    }
  }
}
</script>
