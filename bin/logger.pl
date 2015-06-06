#!/usr/bin/env perl
use strict;
use warnings;
use Getopt::Long;

my $PATH = './log';
GetOptions(
    'p:s' => \$PATH,
    );

my $FP = undef;
my $INODE = undef;
my $FNAME = '';
my $prev = 0;

sub fp {
    my $now = time();
    my ($dev, $inode) = stat("$PATH");
    unless ( $inode && $INODE && $inode eq $INODE ) {
        if ( $FP ) {
            $FP->flush();
            close($FP);
        }
        open($FP, ">>$PATH");
        if ( $FP ) {
            (my $dev, $INODE) = stat($FP);
        }
    }
}

while ( my $line = <STDIN> ){
    fp();
    print $FP $line;
    print $line;
}
