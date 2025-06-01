// This script helps to register path mappings at runtime
import { register } from 'tsconfig-paths';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseUrl = join(__dirname);

register({
    baseUrl,
    paths: {
        '@utils/*': ['utils/*'],
        '@middleware/*': ['middleware/*']
    }
});
