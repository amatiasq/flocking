/* istanbul ignore next */
export function random(first: number, second = -first) {
  const min = Math.min(first, second);
  const max = Math.max(first, second);
  return Math.round(Math.random() * (max - min) + min);
}
