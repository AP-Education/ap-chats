// The tile's edges are the plain base colour, so iOS and Android icons fill its corners with it
// seamlessly and crop it with their own masks; desktops get it on the macOS 824/1024 icon grid.
// Full colour, as a quantised palette blotches the light gradients.
const base = { fit: 'contain', background: '#0c1113' };

export default {
  preset: {
    png: { compressionLevel: 9, palette: false },
    transparent: { sizes: [192, 512], padding: 0.195 },
    maskable: { sizes: [512], padding: 0.1, resizeOptions: base },
    apple: { sizes: [180], padding: 0, resizeOptions: base },
  },
  images: ['public/app-icon.svg'],
};
