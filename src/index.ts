import express from 'express';
import { Prometheus } from './prometheus';
import { Subscriber } from './subscriber';

main();

export async function main(): Promise<void> {
    const ksmWatcher = express();
    ksmWatcher.get('/healthcheck', async (req: express.Request, res: express.Response): Promise<void> => {
        res.status(200).send('OK!')
    });

    const port = process.env.KSM_WATCHER_PORT;
    ksmWatcher.listen(port, () => {
      console.log(`KsmWatcher listening at http://localhost:${port}/healthcheck`)
    })

    const promClient = new Prometheus(ksmWatcher);    
    const subscriber = new Subscriber(promClient);
    await subscriber.start();
}
