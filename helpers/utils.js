module.exports = {
  formatNumber(number) {
    return new Intl.NumberFormat('en-EN', {
      maximumSignificantDigits: 21,
    }).format(number);
  },
};
