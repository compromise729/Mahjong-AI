export class Ledger {
  constructor(){this.scores=[0,0,0,0];this.entries=[];this.kongFunds=[];}
  pay(from,to,amount,reason,event){
    if(from===to||amount===0)return;
    if(!Number.isFinite(amount)||amount<0)throw new Error('Invalid payment');
    this.scores[from]-=amount;this.scores[to]+=amount;
    this.entries.push({from,to,amount,reason,event});
  }
  kong(type,seat,source,active,event){
    const payers=type==='openKong'?[source]:active.filter(s=>s!==seat);
    return payers.map(from=>{
      const amount=type==='addedKong'?1:2;
      this.pay(from,seat,amount,type,event);
      const id=this.kongFunds.length;
      this.kongFunds.push({id,from,owner:seat,amount,refunded:false});
      return id;
    });
  }
  transfer(ids,to,event){
    for(const id of ids){
      const fund=this.kongFunds[id];
      if(!fund||fund.refunded)continue;
      this.pay(fund.owner,to,fund.amount,'callTransfer',event);
      fund.owner=to;
    }
  }
  refund(seat,event){
    for(const fund of this.kongFunds){
      if(fund.owner!==seat||fund.refunded)continue;
      this.pay(seat,fund.from,fund.amount,'refund',event);
      fund.refunded=true;
    }
  }
}
