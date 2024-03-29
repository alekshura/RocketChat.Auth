// We use cryptographically strong PRNGs (crypto.getRandomBytes())
// When using crypto.getRandomValues(), our primitive is hexString(),
// from which we construct fraction().

import NodeRandomGenerator from './NodeRandomGenerator';
import createRandom from './createRandom';

const Random = createRandom(new NodeRandomGenerator());

export default Random;