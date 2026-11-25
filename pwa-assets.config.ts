import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Android (maskable) and iOS (apple-touch) apply their own rounded mask, so those icons fill the whole square.
const fullBleed = { padding: 0, resizeOptions: { background: '#e11d48' } }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ['public/icon.svg'],
})
