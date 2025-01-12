import {
    ApolloLink,
    Operation,
    FetchResult,
    NextLink
} from '@apollo/client/link/core';
import {
    Observable,
    Observer,
} from '@apollo/client/utilities';

interface OperationQueueEntry {
    operation: Operation;
    forward: NextLink;
    observer: Observer<FetchResult>;
    subscription?: { unsubscribe: () => void };
}

export default class QueueLink extends ApolloLink {
    private opQueue: OperationQueueEntry[] = [];
    private isOpen = true;
    
    public open() {
        this.isOpen = true;
        this.opQueue[0].forward(this.opQueue[0].operation).subscribe(this.opQueue[0].observer);
    }

    public close() {
        this.isOpen = false;
    }

    public request(operation: Operation, forward: NextLink){
        if (this.isOpen) {
            return forward(operation);
        }
        if (operation.getContext().skipQueue) {
            return forward(operation);
        }
        return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
            const operationEntry = { operation, forward, observer };
            this.enqueue(operationEntry);
            return () => this.cancelOperation(operationEntry);
        });
    }

    private cancelOperation(entry: OperationQueueEntry) {
        this.opQueue = this.opQueue.filter(e => e !== entry);
        if(this.opQueue.length!==0)
        this.opQueue[0].forward(this.opQueue[0].operation).subscribe(this.opQueue[0].observer);
    }

    private enqueue(entry: OperationQueueEntry) {
        this.opQueue.push(entry);
    }
    
}