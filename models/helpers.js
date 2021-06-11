function tn(details){
    var U= details.units;
    var bill,subsidy=150;
    if(U<=100){
        bill=1.5*U;
    }
    else if(U>100 && U<=200){
        bill=1.5*U;
        bill+=20;       //Adding fixed tariff
    }
    else if(U>200 && U<=500){
        bill=150+200;
        bill+=(U-200)*3;
        bill+=30;       //Adding fixed tariff
    }
    else{
        bill=150+350+1380;
        bill+=(U-500)*6.6;
        bill+=50;      //Adding fixed tariff
    }
    return bill;
}

function states(details){
    var tnbill= tn(details)
    return {"Tamil Nadu": tnbill};
}
module.exports= {states: states};