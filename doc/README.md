# Technical documentation

## Alerts

```json
{
    "source": "MOCK",
    "market":"BTC-USD" ,
    "price": "{{high}}" ,
    "emitKey" : "TO_DEFINE",
    "dryrun" : false,
    "details" : {
        "plots" : [ "{{plot_1}}","{{plot_2}}","{{plot_3}}","{{plot_4}}","{{plot_5}}","{{plot_6}}","{{plot_7}}","{{plot_8}}","{{plot_9}}","{{plot_10}}","{{plot_11}}","{{plot_12}}","{{plot_13}}","{{plot_14}}","{{plot_15}}","{{plot_16}}","{{plot_17}}","{{plot_18}}","{{plot_19}}"]
    } 
}
```
### Sources details

* `SMART_MONEY_CONCEPTS`
    * type `Bullish BOS` `Bearish BOS` 
* `SUPER_TREND`
    * action `BUY` `SELL`
    * limit `{{plot_6}}`
