import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'public-demo',base:'./',plugins:[react()],build:{target:'es2022',outDir:'../dist-demo',emptyOutDir:true},server:{host:'127.0.0.1',port:8771,fs:{allow:['.']}}});
