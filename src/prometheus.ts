import * as express from 'express';
import { register } from 'prom-client';
import * as promClient from 'prom-client';
import { PromClient } from './types';


export class Prometheus implements PromClient {

    static readonly nameValidatorOfflineSessionMetric  = 'kusama_offline_validator_session_reports_state';

    private numberOfActiveSetValidators: promClient.Gauge;
    private stateValidatorOfflineSessionReports: promClient.Gauge;
    private stateValidatorOfflineOnce: promClient.Gauge;
    private stateValidatorOfflinePreviousSession: promClient.Gauge;

    constructor(ksmWatcher: express.Application) {
        this._initMetrics();
        ksmWatcher.get('/metrics', (req: express.Request, res: express.Response) => {
            res.set('Content-Type', register.contentType)
            res.end(register.metrics())
        })
        console.log('Metrics available under /metrics');
        promClient.collectDefaultMetrics();
    }

    setNumberOfActiveSetValidators(total_num: number): void {
      this.numberOfActiveSetValidators.set(total_num)
    }

    // Condition where you are risking to be reported as offline
    setStatusValidatorOffline(name: string): void {
        this.stateValidatorOfflineSessionReports.set({ name }, 1);        
    }

    resetStatusValidatorOffline(name: string): void {
        this.stateValidatorOfflineSessionReports.set({ name }, 0);
    }

    isValidatorStatusOffline(name: string): boolean {
      return promClient.register.getSingleMetric(Prometheus.nameValidatorOfflineSessionMetric)['hashMap']['name:'+name]['value'] === 1
    }

    // Set Reported as offline at least once
    setStatusValidatorOfflineOnce(name: string): void {
        this.stateValidatorOfflineOnce.set({ name }, 1);        
    }

    // Reset Reported as offline at least once
    resetStatusValidatorOfflineOnce(name: string): void {
        this.stateValidatorOfflineOnce.set({ name }, 0);        
    }

    _initMetrics(): void {
        this.numberOfActiveSetValidators = new promClient.Gauge({
          name: 'kusama_num_active_set_validators_total',
          help: 'Number of validators forming the active set',
          labelNames: ['name']
        });
        this.stateValidatorOfflineSessionReports = new promClient.Gauge({
            name: Prometheus.nameValidatorOfflineSessionMetric,
            help: 'Whether a validator is reported as offline in the current session',
            labelNames: ['name']
        });
        this.stateValidatorOfflineOnce = new promClient.Gauge({
            name: 'kusama_offline_validator_session_at_least_once',
            help: 'Whether a validator is reported as offline at least once in the current session',
            labelNames: ['name']
        });
    }
}
