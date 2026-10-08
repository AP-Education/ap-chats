// Tabs show the bare bubble, edge to edge; the PNG and .ico serve browsers that skip the SVG.
export default {
  preset: {
    transparent: { sizes: [96], padding: 0, favicons: [[48, 'favicon.ico']] },
    maskable: { sizes: [] },
    apple: { sizes: [] },
    assetName: (_, size) => `favicon-${size.width}x${size.height}.png`,
  },
  images: ['public/favicon.svg'],
};
