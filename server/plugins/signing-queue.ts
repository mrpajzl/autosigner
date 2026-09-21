import { signingQueue } from '../utils/signing-queue'
export default defineNitroPlugin(nitro => {
  signingQueue.start()
  nitro.hooks.hook('close', () => signingQueue.stop())
})
