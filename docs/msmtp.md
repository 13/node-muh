# mstmp-queue

Set msmtp-queue as the default sendmailer

#### /etc/mail.rc
```
set mta=/usr/local/bin/msmtp-runqueue.sh
```

#### /etc/msmtprc
```
aliases /etc/aliases
```

#### /etc/aliases   
```
default: admin@domain.example
```

#### Test
```
echo "hello there username." | msmtp -a default username@domain.com
```
