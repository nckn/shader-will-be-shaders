const mapValue = (x, inMin, inMax, outMin, outMax) => {
  return outMin + ((outMax - outMin) * (x - inMin)) / (inMax - inMin);
}

export {
  mapValue
}
