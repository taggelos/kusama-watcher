import { ApiPromise, WsProvider } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { Header, SessionIndex, ValidatorId } from '@polkadot/types/interfaces';
import { Tuple, Vec } from '@polkadot/types/codec';
import { PromClient, ValidatorImOnlineParameters} from './types';
import { getActiveEraIndex, getHeartbeatBlockThreshold, hasValidatorProvedOnline, isNewSessionEvent } from './utils';

export class Subscriber {
    private api: ApiPromise;
    private static readonly endpoint ="wss://kusama-rpc.polkadot.io/";
    private validators: Array<string>;
    private currentEraIndex: number;
    private validatorActiveSet: Vec<ValidatorId>;
    private sessionIndex: SessionIndex;

    constructor( private readonly promClient: PromClient) {
        this.validators = JSON.parse(process.env.KSM_WATCHER_VALIDATORS)
        console.log("validators as Configs "+ this.validators)
    }

    public async start(): Promise<void> {
        try {
          await this._initAPI();
        } catch (error) {
          console.error("initAPI error... exiting: "+JSON.stringify(error))
          process.exit(1)
        }
        await this._initInstanceVariables();
        await this._handleNewHeadSubscriptions();
        await this._subscribeEvents();
    }

    private async _initAPI(): Promise<void> {
        const provider = new WsProvider(Subscriber.endpoint);
        this.api = new ApiPromise({provider})
        if(this.api){
          this.api.on("error", error => {
            if( error.toString().includes("FATAL") || JSON.stringify(error).includes("FATAL") ){
              console.error("The API had a FATAL error... exiting!")
              process.exit(1)
            }
          })
        }
        await this.api.isReadyOrError;
        const [chain, nodeName, nodeVersion] = await Promise.all([
            this.api.rpc.system.chain(),
            this.api.rpc.system.name(),
            this.api.rpc.system.version()
        ]);
        console.log("Connected on Kusama successfully");
    }

    private async _initInstanceVariables(): Promise<void>{
      this.sessionIndex = await this.api.query.session.currentIndex();
      this.currentEraIndex = await getActiveEraIndex(this.api);
      this.validatorActiveSet = await this.api.query.session.validators();
      console.log( `sessionIndex -> ${this.sessionIndex} currentEraIndex -> ${this.currentEraIndex} validatorActiveSet ${this.validatorActiveSet}  countOfValidators ${this.validatorActiveSet.length}`);
      //Init the number of active set validators as well
      this.promClient.setNumberOfActiveSetValidators(this.validatorActiveSet.length);
    }

    private async _handleNewHeadSubscriptions(): Promise<void> {
      this._initSessionOfflineMetrics();
      this.api.rpc.chain.subscribeNewHeads(async (header) => {
        this._validatorStatusHandler(header);
      })
    }

    private async _subscribeEvents(): Promise<void> {
      this.api.query.system.events((events) => {
          events.forEach(async (record) => {
              const { event } = record;
              if(isNewSessionEvent(event)){
                await this._newSessionEventHandler()
              }
          });
      });
    }

    private _solveOfflineStatus(validator: string): void{
      this.promClient.resetStatusValidatorOffline(validator);
    }

    private async _validatorStatusHandler(header: Header): Promise<void> {
      const parameters = await this._getImOnlineParametersAtomic(header)
      //Check Validators offline status
      this.validators.forEach(async validator => {
        const validatorActiveSetIndex = parameters.validatorActiveSet.indexOf(validator)
        if ( validatorActiveSetIndex >= 0 ) await this._checkValidatorOfflineStatus(parameters,validator,validatorActiveSetIndex);
      }) 
      
    }

    private async _checkValidatorOfflineStatus(parameters: ValidatorImOnlineParameters,validator: string,validatorActiveSetIndex: number): Promise<void>{
      if(parameters.isHeartbeatExpected) {
        if ( await hasValidatorProvedOnline(validator,validatorActiveSetIndex,parameters.sessionIndex,this.api) ) {
          this._solveOfflineStatus(validator)
        }
        else {
          console.log(`Target ${validator} has either not authored any block or sent any heartbeat yet in session:${parameters.sessionIndex}/era:${parameters.eraIndex}`);
          this.promClient.setStatusValidatorOffline(validator);
          this.promClient.setStatusValidatorOfflineOnce(validator);
        }
      }
      else if ( this.promClient.isValidatorStatusOffline(validator) ) {
        // Roughly in the middle of the session duration
        if ( await hasValidatorProvedOnline(validator,validatorActiveSetIndex,parameters.sessionIndex,this.api) ){
          this._solveOfflineStatus(validator)
        }
      }
      
    }

    private async _newSessionEventHandler(): Promise<void> {
      this.sessionIndex = await this.api.query.session.currentIndex();
      const newEraIndex = await getActiveEraIndex(this.api);
      if( newEraIndex > this.currentEraIndex ){
        await this._newEraHandler(newEraIndex)
      }
    }

    private async _newEraHandler(newEraIndex: number): Promise<void>{
      this.currentEraIndex = newEraIndex;
      this.validatorActiveSet = await this.api.query.session.validators();
      //Update the number of active set validators as well
      this.promClient.setNumberOfActiveSetValidators(this.validatorActiveSet.length);
      //Reset for validators for new era
      this.validators.forEach((validator) => {
          this.promClient.resetStatusValidatorOfflineOnce(validator);
      });
    }

    private async _getImOnlineParametersAtomic(header: Header): Promise<ValidatorImOnlineParameters> {
      const sessionIndex = this.sessionIndex
      const eraIndex = this.currentEraIndex
      const validatorActiveSet = this.validatorActiveSet
      console.log(`Current EraIndex: ${eraIndex}\tCurrent SessionIndex: ${sessionIndex}`);
      const isHeartbeatExpected = await this._isHeadAfterHeartbeatBlockThreshold(header)
      return { isHeartbeatExpected, sessionIndex, eraIndex, validatorActiveSet } 
    }

    private async _isHeadAfterHeartbeatBlockThreshold(header: Header): Promise<boolean> {
        const currentBlock = header.number.toBn()
        const blockThreshold = await getHeartbeatBlockThreshold(this.api)
        console.log(`Current Block: ${currentBlock}\tHeartbeatBlock Threshold: ${blockThreshold}`);
        return currentBlock.cmp(blockThreshold) > 0
    }
    
    //In order to display init values
    private _initSessionOfflineMetrics(): void {
      this.validators.forEach((validator) => {
        this.promClient.resetStatusValidatorOffline(validator);
        this.promClient.resetStatusValidatorOfflineOnce(validator);
      });
    }
}
