While working on an internal app we noticed that transactions that were sent
to Coinbase Smart Wallet via ThirdWeb's `mutateAsync()` from `useSendCalls()`
does not lead to transactions that are sponsored by the configured paymaster.


# example

Note how `Payment methods` is the key's address rather than a sponsored tx.  

<img width="1046" height="806" alt="Screenshot 2025-08-01 at 2 48 09 PM" src="https://github.com/user-attachments/assets/1c0b55e8-48d8-4124-96db-cb91713cf8e5" />


# how to test

Replace value in `const clientId = 'replace-with-your-thirdweb-client-id'` with
real ThirdWeb clientId value.

```
bun install
bun run start
```
