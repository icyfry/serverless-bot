# Technical documentation

## Lambda inputs

```json
{
    "source": "MOCK",
    "market":"BTC-USD" ,
    "price": "{{high}}" ,
    "emitKey" : "MOCK",
    "dryrun" : false,
    "roundingFactorSize" : 100000000,
    "roundingFactorPrice" : 100,
    "interval" : 3600,
    "details" : {} 
}
```

### Trend Signal

```json
"details" : {
    "trend":"BUY",
    "entry":"{{plot_6}}",
    "cancel" : "{{plot_1}}",
    "plots" : [ "{{plot_1}}","{{plot_2}}","{{plot_3}}","{{plot_4}}","{{plot_5}}","{{plot_6}}","{{plot_7}}","{{plot_8}}","{{plot_9}}","{{plot_10}}","{{plot_11}}","{{plot_12}}","{{plot_13}}","{{plot_14}}","{{plot_15}}","{{plot_16}}","{{plot_17}}","{{plot_18}}","{{plot_19}}"]
}

```