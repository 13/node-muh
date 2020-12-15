# Wiring

### RJ45

```

 _____________________
|  _________________  |
| | . . . . . . . . | |
| | | | | | | | | | | |
| | 1 2 3 4 5 6 7 8 | |
| |___           ___| |
|     |__     __|     |
|        |___|        |
|_____________________|

```

### Diagram

| Pin | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|:----|:-:|:-:|:-:|:-:|:-:|:--:|:-:|:-:|
| Color | white/green | green | white/orange | blue | white/blue | orange | white/brown | brown |
| T568A | ![white_green](https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Wire_white_green_stripe.svg/90px-Wire_white_green_stripe.svg.png "white green") | ![green](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Wire_green.svg/90px-Wire_green.svg.png "green") | ![white_orange](https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wire_white_orange_stripe.svg/90px-Wire_white_orange_stripe.svg.png "white orange") | ![blue](https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Wire_blue.svg/90px-Wire_blue.svg.png "blue") | ![white_blue](https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Wire_white_blue_stripe.svg/90px-Wire_white_blue_stripe.svg.png "white blue") | ![orange](https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Wire_orange.svg/90px-Wire_orange.svg.png "orange") | ![white_brown](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Wire_white_brown_stripe.svg/90px-Wire_white_brown_stripe.svg.png "white brown") | ![brown](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Wire_brown.svg/90px-Wire_brown.svg.png "brown solid") |
| G | G reed || VCC ||| GND ||| 
| GD | GD reed | GDL reed | VCC ||| GND |||
| HD | HD reed | HDL reed | VCC | B switch | LED | GND |||


### RPi

| P | H | D | RD | RN | RO | RO | RN | RD | D | H | P |
|:-:|:-:|:-:|:--:|:--:|:--:|:--:|:--:|:--:|:-:|:-:|:-:|
| | | X | 3.3V | 1 | X | X | 2 | 5V | X | | |
| i2c | | | GPIO 2 | 3 | O | X | 4 | 5V | | | |
| i2c | | | GPIO 3 | 5 | O | X | 6 | GND | X | | |
| | 1-Wire | 1-Wire | GPIO 4 | 7 | X | O | 8 | GPIO 14 | | | UART |
| | | | GND | 9 | O | O | 10 | GPIO 15 | | | UART |

```
P = Protocoll
H = Hardware
D = Description
RD = Raspberry Pi Description
RN = Raspberry Pi Num
RO = Raspberry Pi Occupied
```
